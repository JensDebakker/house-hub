import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketChannel, useWebSocketSend } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import type { ChatMessage, ChatMessageDeletedEvent } from '@/types';

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

      if (payload != null && typeof payload === 'object' && 'deletedId' in payload) {
        const event = payload as ChatMessageDeletedEvent;
        if (event.householdId !== householdId) return;

        queryClient.setQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId), (current) =>
          (current ?? []).filter((m) => m.id !== event.deletedId),
        );
        return;
      }

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

/** Deletes a chat message over REST. There's no websocket echo back to the deleter (only
 * other connected clients get the `deletedId` event), so the deleter's own cache is
 * updated optimistically here rather than waiting on a server response. */
export function useDeleteChatMessage(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/households/${householdId}/chat-messages/${id}`);
    },
    onMutate: async (id: string) => {
      if (!householdId) return undefined;
      const previous = queryClient.getQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId));
      queryClient.setQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId), (current) =>
        (current ?? []).filter((m) => m.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (!householdId || !context?.previous) return;
      queryClient.setQueryData<ChatMessage[]>(chatMessagesQueryKey(householdId), context.previous);
    },
  });
}
