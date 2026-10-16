import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { FeedbackAttachmentThumbnail } from '@/components/FeedbackAttachmentThumbnail';
import { FeedbackStatusBadge } from '@/components/FeedbackStatusBadge';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import {
  MAX_FEEDBACK_ATTACHMENTS,
  feedbackQueryKey,
  useAddFeedbackAttachmentsMutation,
  useCreateFeedbackMutation,
  useDeleteFeedbackAttachmentMutation,
  useFeedbackListQuery,
  useUpdateFeedbackMutation,
} from '@/lib/useFeedback';
import { inputStyle } from '@/lib/formStyles';
import type { FeedbackAttachment, FeedbackTicket, FeedbackType } from '@/types';

const FEEDBACK_COLOR = '#f97316';
const MAX_ATTACHMENTS = MAX_FEEDBACK_ATTACHMENTS;
/** Matches the backend's @Size(max = 2000) on the feedback description. */
const MAX_DESCRIPTION_LENGTH = 2000;

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'BUG', label: 'Bug report' },
  { value: 'SUGGESTION', label: 'Suggestion' },
];

/**
 * The backend only allows edits while a ticket is OPEN and answers 409 otherwise (e.g. an
 * admin moved it to IN_PROGRESS since this list was loaded) - turn that into a readable
 * message instead of a generic failure.
 */
function editErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.status === 409) {
    return 'This ticket is no longer open, so it can’t be edited anymore.';
  }
  return getErrorMessage(err, fallback);
}

function SmallButton({
  label,
  onPress,
  disabled,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderWidth: 1,
        borderColor: primary ? '#2563eb' : '#ccc',
        backgroundColor: primary ? '#2563eb' : 'white',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: primary ? 'white' : '#111827', fontWeight: primary ? '600' : '400', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TicketRow({ ticket, userId }: { ticket: FeedbackTicket; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const updateFeedback = useUpdateFeedbackMutation(userId);
  const addAttachments = useAddFeedbackAttachmentsMutation(userId);
  const deleteAttachment = useDeleteFeedbackAttachmentMutation(userId);

  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<FeedbackType>(ticket.type);
  const [draftDescription, setDraftDescription] = useState(ticket.description);
  const [rowError, setRowError] = useState<string | null>(null);

  const isOpen = ticket.status === 'OPEN';
  const canEdit = isOpen && editing;
  const busy = updateFeedback.isPending || addAttachments.isPending || deleteAttachment.isPending;
  const remainingSlots = MAX_FEEDBACK_ATTACHMENTS - ticket.attachments.length;

  const handleError = (err: unknown, fallback: string) => {
    setRowError(editErrorMessage(err, fallback));
    if (isAxiosError(err) && err.response?.status === 409) {
      // Pull the ticket's real (non-OPEN) status so the edit controls disappear.
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: feedbackQueryKey(userId ?? '') });
    }
  };

  const startEditing = () => {
    setDraftType(ticket.type);
    setDraftDescription(ticket.description);
    setRowError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setRowError(null);
    setEditing(false);
  };

  const save = () => {
    const description = draftDescription.trim();
    if (!description) return;
    setRowError(null);
    updateFeedback.mutate(
      { ticketId: ticket.id, type: draftType, description },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => handleError(err, 'Failed to save your changes.'),
      },
    );
  };

  const addImages = async () => {
    setRowError(null);
    if (remainingSlots <= 0) {
      setRowError(`A ticket can have up to ${MAX_FEEDBACK_ATTACHMENTS} images.`);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, multiple: true });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const picked = result.assets.slice(0, remainingSlots);
    addAttachments.mutate(
      { ticketId: ticket.id, files: picked },
      {
        onSuccess: () => {
          if (result.assets.length > remainingSlots) {
            setRowError(`Only the first ${remainingSlots} image(s) were added - max ${MAX_FEEDBACK_ATTACHMENTS} per ticket.`);
          }
        },
        onError: (err) => handleError(err, 'Failed to add images.'),
      },
    );
  };

  const removeAttachment = (attachment: FeedbackAttachment) => {
    confirmDestructive({
      title: 'Remove image?',
      message: `Remove "${attachment.originalFilename}" from this ticket? This cannot be undone.`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        setRowError(null);
        deleteAttachment.mutate(
          { ticketId: ticket.id, attachmentId: attachment.id },
          { onError: (err) => handleError(err, 'Failed to remove image.') },
        );
      },
    });
  };

  return (
    <View
      testID={`feedback-ticket-${ticket.id}`}
      style={{ gap: 6, padding: 12, borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#eee' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {canEdit ? (
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: 'white' }}>
            <Picker selectedValue={draftType} onValueChange={(v: FeedbackType) => setDraftType(v)} enabled={!busy}>
              {TYPE_OPTIONS.map((opt) => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </View>
        ) : (
          <Text style={{ fontWeight: '700' }}>{ticket.type === 'BUG' ? 'Bug report' : 'Suggestion'}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FeedbackStatusBadge status={ticket.status} />
          {isOpen && !editing ? <SmallButton label="Edit" onPress={startEditing} /> : null}
        </View>
      </View>

      {rowError ? <Text style={{ color: '#c62828' }}>{rowError}</Text> : null}

      {canEdit ? (
        <TextInput
          value={draftDescription}
          onChangeText={setDraftDescription}
          editable={!busy}
          multiline
          numberOfLines={4}
          maxLength={MAX_DESCRIPTION_LENGTH}
          style={[inputStyle, { minHeight: 90, textAlignVertical: 'top', backgroundColor: 'white' }]}
        />
      ) : (
        <Text style={{ color: '#374151' }}>{ticket.description}</Text>
      )}

      {ticket.attachments.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ticket.attachments.map((a) => (
            <View key={a.id}>
              <FeedbackAttachmentThumbnail url={`/feedback/${ticket.id}/attachments/${a.id}`} filename={a.originalFilename} />
              {canEdit ? (
                <Pressable
                  onPress={() => removeAttachment(a)}
                  disabled={busy}
                  accessibilityLabel={`Remove ${a.originalFilename}`}
                  hitSlop={6}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#c62828',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, lineHeight: 14 }}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {canEdit ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <SmallButton
            label={addAttachments.isPending ? 'Uploading…' : `Add image (${ticket.attachments.length}/${MAX_FEEDBACK_ATTACHMENTS})`}
            onPress={addImages}
            disabled={busy || remainingSlots <= 0}
          />
          <View style={{ flex: 1 }} />
          <SmallButton label="Cancel" onPress={cancelEditing} disabled={updateFeedback.isPending} />
          <SmallButton
            label={updateFeedback.isPending ? 'Saving…' : 'Save'}
            onPress={save}
            disabled={busy || !draftDescription.trim()}
            variant="primary"
          />
        </View>
      ) : null}
      {canEdit ? (
        <Text style={{ color: '#9ca3af', fontSize: 11 }}>
          Image changes are applied right away; Save applies the type and description.
        </Text>
      ) : null}

      <Text style={{ color: '#9ca3af', fontSize: 12 }}>
        Submitted {new Date(ticket.createdAt).toLocaleString()}
        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt
          ? ` · Updated ${new Date(ticket.updatedAt).toLocaleString()}`
          : ''}
      </Text>
    </View>
  );
}

export default function FeedbackScreen() {
  const { user } = useAuth();
  const feedbackQuery = useFeedbackListQuery(user?.id);
  const createFeedback = useCreateFeedbackMutation(user?.id);

  const [type, setType] = useState<FeedbackType>('BUG');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<DocumentPickerAsset[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const pickImages = async () => {
    setPickerError(null);
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setPickerError(`You can attach up to ${MAX_ATTACHMENTS} images.`);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, multiple: true });
    if (result.canceled || !result.assets) return;
    const picked = result.assets.slice(0, remaining);
    if (result.assets.length > remaining) {
      setPickerError(`Only the first ${remaining} image(s) were added - max ${MAX_ATTACHMENTS} per ticket.`);
    }
    setAttachments((prev) => [...prev, ...picked]);
  };

  const removeAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  };

  const submit = () => {
    if (!description.trim()) return;
    createFeedback.mutate(
      { type, description: description.trim(), files: attachments },
      {
        onSuccess: () => {
          setDescription('');
          setAttachments([]);
        },
      },
    );
  };

  const errorMessage = feedbackQuery.isError
    ? getErrorMessage(feedbackQuery.error, 'Failed to load your feedback.')
    : createFeedback.isError
      ? getErrorMessage(createFeedback.error, 'Failed to submit feedback.')
      : pickerError;

  const tickets = feedbackQuery.data ?? [];

  return (
    <Module title="Feedback" color={FEEDBACK_COLOR} scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        Report a bug or suggest an improvement. You&apos;ll only see your own submitted tickets here.
      </Text>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ gap: 8 }}>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
          <Picker selectedValue={type} onValueChange={(v: FeedbackType) => setType(v)}>
            {TYPE_OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>

        <TextInput
          placeholder="Describe the bug or suggestion…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
        />

        {attachments.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {attachments.map((a) => (
              <Pressable key={a.uri} onLongPress={() => removeAttachment(a.uri)}>
                <View style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                  <Image source={{ uri: a.uri }} style={{ width: 72, height: 72 }} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={pickImages}
            disabled={attachments.length >= MAX_ATTACHMENTS}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              opacity: attachments.length >= MAX_ATTACHMENTS ? 0.5 : 1,
            }}
          >
            <Text>Attach image ({attachments.length}/{MAX_ATTACHMENTS})</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={createFeedback.isPending || !description.trim()}
            style={{
              backgroundColor: '#2563eb',
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 18,
              opacity: createFeedback.isPending || !description.trim() ? 0.6 : 1,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              {createFeedback.isPending ? 'Submitting…' : 'Submit'}
            </Text>
          </Pressable>
        </View>
        {attachments.length > 0 ? (
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>Long-press an attachment to remove it.</Text>
        ) : null}
      </View>

      <Text style={{ fontWeight: '700', marginTop: 8 }}>Your tickets</Text>

      {feedbackQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingTop: 4, paddingBottom: 16 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>You haven&apos;t submitted any feedback yet.</Text>}
          renderItem={({ item }) => <TicketRow ticket={item} userId={user?.id} />}
        />
      )}
    </Module>
  );
}
