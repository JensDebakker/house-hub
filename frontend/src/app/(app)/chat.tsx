import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { useChatMessagesQuery, useSendChatMessage } from '@/lib/useChatMessages';
import type { ChatMessage } from '@/types';

const CHAT_COLOR = '#db2777';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  const messagesQuery = useChatMessagesQuery(householdId);
  const sendChatMessage = useSendChatMessage(householdId);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // The backend returns history newest-first; a normal chat UI reads oldest-at-top,
  // newest-at-bottom, so reverse it for display.
  const messages = useMemo(() => [...(messagesQuery.data ?? [])].reverse(), [messagesQuery.data]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendChatMessage(text);
    setText('');
  };

  const errorMessage = messagesQuery.isError
    ? getErrorMessage(messagesQuery.error, 'Failed to load chat history.')
    : null;

  return (
    <BigCardShell title="Chat" color={CHAT_COLOR} scroll={false}>
      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      {messagesQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingTop: 8, paddingBottom: 8 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>No messages yet - say hello.</Text>}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.id;
            return (
              <View
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isMine ? '#fce7f3' : '#f3f4f6',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: '#555' }}>{item.senderDisplayName}</Text>
                  <Text style={{ fontSize: 11, color: '#999' }}>{formatTime(item.createdAt)}</Text>
                </View>
                <Text style={{ marginTop: 2 }}>{item.text}</Text>
              </View>
            );
          }}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Message…"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim()}
          style={{
            backgroundColor: '#2563eb',
            borderRadius: 8,
            padding: 12,
            justifyContent: 'center',
            opacity: !text.trim() ? 0.6 : 1,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>
        </Pressable>
      </View>
    </BigCardShell>
  );
}
