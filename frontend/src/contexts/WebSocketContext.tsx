import { usePathname, useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getValidAccessToken } from '@/lib/api';
import { getWebSocketUrl } from '@/lib/ws';

/** The household whose route is currently open, if any. `useSegments()` gives the
 * *literal* matched file segments (e.g. `["(app)", "house", "[householdId]", "chat"]` -
 * the dynamic segment's placeholder name, not its value), so checking that the segment
 * right after "house" is literally "[householdId]" tells us structurally whether we're
 * actually inside that dynamic route - true for any house feature screen, false for a
 * static sibling under the same "house/" prefix (house/create, house/join, or any future
 * one) *and* for every other top-level route (settings, admin, feedback, ...), without
 * having to hand-maintain a blocklist of every non-household sibling that needs excluding
 * as more get added. Once that's confirmed, the actual id is read off the pathname at the
 * same position - segments don't carry resolved param values, only the placeholder name. */
function useActiveHouseholdId(): string | undefined {
  // Cast away expo-router's typed-routes segment-tuple typing: we're reading this
  // structurally (is "house" followed by "[householdId]" anywhere in here), not using it
  // as a navigation target, so the precise literal-tuple type isn't useful here and only
  // gets in the way of a plain .indexOf/index lookup.
  const segments = useSegments() as string[];
  const pathname = usePathname();

  const houseIndex = segments.indexOf('house');
  const isHouseholdRoute = houseIndex !== -1 && segments[houseIndex + 1] === '[householdId]';
  if (!isHouseholdRoute) return undefined;

  return /^\/house\/([^/]+)/.exec(pathname)?.[1];
}

/** 'chat' and 'presence' are household-scoped - the socket connection itself must be
 * opened with the current household's id (see `connect` below) for the backend's chat
 * relay / presence tracker to deliver anything on these channels. `householdId` below
 * tracks whichever house's route is currently open, so this stays correct without any
 * extra per-channel wiring. */
export type WebSocketChannelName = 'version' | 'chat' | 'presence';

export type WebSocketEnvelope<TPayload = unknown> = {
  channel: WebSocketChannelName;
  houseId?: string;
  payload: TPayload;
};

type ChannelHandler = (payload: unknown) => void;

type WebSocketContextValue = {
  /** Subscribe to messages on a channel; returns an unsubscribe function. */
  subscribe: (channel: WebSocketChannelName, handler: ChannelHandler) => () => void;
  /** Sends an envelope over the socket; no-ops silently if it isn't currently open. */
  send: (envelope: WebSocketEnvelope) => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Household-scoped channels ('chat', 'presence') need the socket itself opened with
  // whichever house is actually being viewed right now - derived from the route, not a
  // fixed "household 0" convention, now that the Houses overview lets a user be on no
  // house's route at all (and multiple houses exist to switch between). No socket is
  // held open while on that overview, house/create, house/join, or any other top-level
  // route outside a specific house (settings, admin, feedback, ...): see the early
  // return below.
  const householdId = useActiveHouseholdId();

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<WebSocketChannelName, Set<ChannelHandler>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const activeRef = useRef(false);
  /** Lets `onclose` trigger a reconnect without `connect` needing to reference
   * itself before it's declared. */
  const connectRef = useRef<() => void>(() => {});
  /** The version this client currently has - set from the first message seen, then
   * compared against every later one to detect a new deploy. Deliberately not reset
   * on reconnect, so a backend restart (new connection, new baseline on the server
   * side) still gets picked up as a change here. */
  const knownVersionRef = useRef<string | null>(null);

  const subscribe = useCallback((channel: WebSocketChannelName, handler: ChannelHandler) => {
    const handlers = listenersRef.current.get(channel) ?? new Set<ChannelHandler>();
    handlers.add(handler);
    listenersRef.current.set(channel, handlers);
    return () => {
      handlers.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (!activeRef.current) return;

    (async () => {
      // Centralizes the "is this access token still valid" check (and refreshes it if
      // not) the same way the REST 401 flow does - without this, a token that went stale
      // while the page was idle/backgrounded (e.g. bfcache) gets read from storage as-is
      // and every reconnect attempt fails the handshake forever, since nothing else here
      // ever triggers a refresh.
      const accessToken = await getValidAccessToken();
      if (!accessToken || !activeRef.current) return;

      const socket = new WebSocket(getWebSocketUrl(accessToken, householdId));
      socketRef.current = socket;

      socket.onopen = () => {
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as WebSocketEnvelope;
          const handlers = listenersRef.current.get(message.channel);
          handlers?.forEach((handler) => handler(message.payload));
        } catch {
          // Ignore malformed frames rather than tearing down the connection.
        }
      };

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (!activeRef.current || reconnectTimerRef.current) return;

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          connectRef.current();
        }, backoffRef.current);
      };

      socket.onerror = () => {
        socket.close();
      };
    })();
  }, [householdId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Re-runs (tearing the socket down and reconnecting) whenever `householdId` changes,
  // not just when `isAuthenticated` flips - navigating between houses (or to/from the
  // Houses overview, which has none) must immediately swap or drop the connection rather
  // than waiting out whatever backoff had accumulated for the previous house. No
  // `householdId` (Houses overview, house/create, house/join) means no socket at all:
  // this effect's own cleanup (below) already closed whatever was open for the
  // previously active house, if any, by the time this run's early return is reached.
  useEffect(() => {
    if (!isAuthenticated || !householdId) return;

    activeRef.current = true;
    backoffRef.current = INITIAL_BACKOFF_MS;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    connect();

    return () => {
      activeRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isAuthenticated, householdId, connect]);

  // Web only: the browser's back-forward cache force-closes any open WebSocket when the
  // page is frozen, and a page can sit frozen/backgrounded long enough for the stored
  // access token to expire. `pageshow` with `event.persisted` is the signal a bfcache
  // restore just happened; recover immediately instead of waiting out whatever backoff
  // had accumulated before the page was frozen.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const recover = () => {
      if (!activeRef.current || socketRef.current) return;

      backoffRef.current = INITIAL_BACKOFF_MS;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      connectRef.current();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) recover();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') recover();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // "version" channel: on web (the always-open kiosk display) a changed version
  // means the backend redeployed, so force a reload. Native has no equivalent
  // forced-update mechanism (that's an app-store/expo-updates concern), so just log.
  useEffect(() => {
    return subscribe('version', (payload) => {
      const value = (payload as { value?: string } | undefined)?.value;
      if (!value) return;

      if (knownVersionRef.current === null) {
        knownVersionRef.current = value;
        return;
      }

      if (value === knownVersionRef.current) return;
      knownVersionRef.current = value;

      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        console.log(`[ws] new backend version detected: ${value}`);
      }
    });
  }, [subscribe]);

  const send = useCallback((envelope: WebSocketEnvelope) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(envelope));
  }, []);

  const value = useMemo<WebSocketContextValue>(() => ({ subscribe, send }), [subscribe, send]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
}

/** Subscribe a handler to a channel for the lifetime of the calling component. */
export function useWebSocketChannel(channel: WebSocketChannelName, handler: ChannelHandler): void {
  const { subscribe } = useWebSocket();
  useEffect(() => subscribe(channel, handler), [subscribe, channel, handler]);
}

/** Send an envelope over the shared socket; no-ops if it isn't currently open. */
export function useWebSocketSend(): WebSocketContextValue['send'] {
  const { send } = useWebSocket();
  return send;
}
