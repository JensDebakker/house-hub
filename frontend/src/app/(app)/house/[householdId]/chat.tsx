import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { findHouseholdMembership } from '@/lib/households';
import { useChatMessagesQuery, useDeleteChatMessage, useSendChatMessage } from '@/lib/useChatMessages';
import type { ChatMessage } from '@/types';

const CHAT_COLOR = '#db2777';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  const messagesQuery = useChatMessagesQuery(householdId);
  const sendChatMessage = useSendChatMessage(householdId);
  const deleteChatMessage = useDeleteChatMessage(householdId);

  const myRole = findHouseholdMembership(user, householdId)?.role;
  const canDelete = (message: ChatMessage) =>
    message.senderId === user?.id || myRole === 'OWNER' || user?.role === 'ADMIN';

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

  const deleteMessage = (message: ChatMessage) => {
    deleteChatMessage.mutate(message.id, {
      onError: (err) => {
        const errorMessage = getErrorMessage(err, 'Failed to delete message.');
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Delete failed', errorMessage);
        }
      },
    });
  };

  const confirmDelete = (message: ChatMessage) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this message?')) {
        deleteMessage(message);
      }
      return;
    }
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(message) },
    ]);
  };

  const errorMessage = messagesQuery.isError
    ? getErrorMessage(messagesQuery.error, 'Failed to load chat history.')
    : null;

  return (
    <Module title="Chat" color={CHAT_COLOR} scroll={false}>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: '#999' }}>{formatTime(item.createdAt)}</Text>
                    {canDelete(item) ? (
                      <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={{ padding: 2 }}>
                        <Text style={{ fontSize: 14, color: '#999', fontWeight: '700' }}>⋯</Text>
                      </Pressable>
                    ) : null}
                  </View>
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
    </Module>
  );
}
