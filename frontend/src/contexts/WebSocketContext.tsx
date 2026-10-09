import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { loadTokens } from '@/lib/storage';
import { getWebSocketUrl } from '@/lib/ws';

/** 'chat' is household-scoped - the socket connection itself must be opened with the
 * current household's id (see `connect` below) for the backend's chat relay to deliver
 * anything on this channel. */
export type WebSocketChannelName = 'version' | 'chat';

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
  const { isAuthenticated, user } = useAuth();
  // Multi-household switching isn't built yet - every screen in this app follows the
  // same "household 0 is THE household" pattern, so the socket connection does too.
  const householdId = user?.households[0]?.householdId;

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
      const tokens = await loadTokens();
      if (!tokens?.accessToken || !activeRef.current) return;

      const socket = new WebSocket(getWebSocketUrl(tokens.accessToken, householdId));
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
  // not just when `isAuthenticated` flips - household data can arrive a tick after login,
  // and the socket must be opened with the right houseId for the backend's chat relay to
  // deliver anything, so a late-arriving id needs an immediate reconnect rather than
  // waiting for the next backoff-scheduled retry.
  useEffect(() => {
    if (!isAuthenticated) return;

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
