import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketChannel, useWebSocketSend } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types';

/** Prefix for client-generated ids on optimistically-appended messages, so incoming
 * "real" messages (which always have a server-assigned uuid) can be told apart from
 * them for de-duping - see `useChatMessagesQuery`'s websocket handler below. */
const OPTIMISTIC_ID_PREFIX = 'optimistic-';

export function chatMessagesQueryKey(householdId: string) {
  return ['households', householdId, 'chat-messages'] as const;
}

/**
 * Fetches the most recent page of chat history (newest-first, per the backend contract)
 * and keeps it live by appending messages received over the `chat` websocket channel.
 *
 * There's no server echo to the sender, so a message this client sends is appended
 * optimistically by `useSendChatMessage` below rather than waiting to see it come back
 * over the socket - the handler here drops the matching optimistic entry once the real
 * one (with a server id) arrives instead of rendering the message twice.
 */
export function useChatMessagesQuery(householdId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: chatMessagesQueryKey(householdId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<ChatMessage[]>(`/households/${householdId}/chat-messages`);
      return data;
    },
    enabled: Boolean(householdId),
  });

  const handleIncoming = useCallback(
    (payload: unknown) => {
      if (!householdId) return;
      const message = payload as ChatMessage;
      if (message.householdId !== householdId) return;

      queryClient.setQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId), (current) => {
        const list = current ?? [];
        if (list.some((m) => m.id === message.id)) return list;

        const withoutOptimisticMatch = list.filter(
          (m) => !(m.id.startsWith(OPTIMISTIC_ID_PREFIX) && m.senderId === message.senderId && m.text === message.text),
        );
        return [message, ...withoutOptimisticMatch];
      });
    },
    [householdId, queryClient],
  );

  useWebSocketChannel('chat', handleIncoming);

  return query;
}

/** Sends a chat message over the websocket (there's no REST POST for this) and
 * optimistically appends it to the react-query cache, since the socket never echoes a
 * sent message back to its own sender. */
export function useSendChatMessage(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const send = useWebSocketSend();
  const { user } = useAuth();

  return useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !householdId) return;

      const optimisticMessage: ChatMessage = {
        id: `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
        householdId,
        senderId: user?.id ?? '',
        senderDisplayName: user?.displayName ?? 'You',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId), (current) => [
        optimisticMessage,
        ...(current ?? []),
      ]);

      send({ channel: 'chat', houseId: householdId, payload: { text: trimmed } });
    },
    [householdId, queryClient, send, user],
  );
}
