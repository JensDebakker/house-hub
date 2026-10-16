import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { FeedbackAttachmentThumbnail } from '@/components/FeedbackAttachmentThumbnail';
import { FeedbackStatusBadge } from '@/components/FeedbackStatusBadge';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, type TranslationKey } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { useCreateFeedbackMutation, useFeedbackListQuery } from '@/lib/useFeedback';
import { inputStyle } from '@/lib/formStyles';
import type { FeedbackTicket, FeedbackType } from '@/types';

const FEEDBACK_COLOR = '#f97316';
const MAX_ATTACHMENTS = 5;

const TYPE_OPTIONS: { value: FeedbackType; label: TranslationKey }[] = [
  { value: 'BUG', label: 'app.feedback.types.BUG' },
  { value: 'SUGGESTION', label: 'app.feedback.types.SUGGESTION' },
];

function TicketRow({ ticket }: { ticket: FeedbackTicket }) {
  const { t, locale } = useTranslation();
  return (
    <View style={{ gap: 6, padding: 12, borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#eee' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '700' }}>{t(`app.feedback.types.${ticket.type}`)}</Text>
        <FeedbackStatusBadge status={ticket.status} />
      </View>
      <Text style={{ color: '#374151' }}>{ticket.description}</Text>
      {ticket.attachments.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ticket.attachments.map((a) => (
            <FeedbackAttachmentThumbnail
              key={a.id}
              url={`/feedback/${ticket.id}/attachments/${a.id}`}
              filename={a.originalFilename}
            />
          ))}
        </View>
      ) : null}
      <Text style={{ color: '#9ca3af', fontSize: 12 }}>
        {t('app.feedback.submittedAt', { date: new Date(ticket.createdAt).toLocaleString(locale) })}
      </Text>
    </View>
  );
}

export default function FeedbackScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
      setPickerError(t('app.feedback.maxAttachments', { max: MAX_ATTACHMENTS }));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, multiple: true });
    if (result.canceled || !result.assets) return;
    const picked = result.assets.slice(0, remaining);
    if (result.assets.length > remaining) {
      setPickerError(t('app.feedback.attachmentsTruncated', { count: remaining, max: MAX_ATTACHMENTS }));
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
    ? getErrorMessage(feedbackQuery.error, t('app.feedback.loadFailed'))
    : createFeedback.isError
      ? getErrorMessage(createFeedback.error, t('app.feedback.submitFailed'))
      : pickerError;

  const tickets = feedbackQuery.data ?? [];

  return (
    <Module title={t('app.feedback.title')} color={FEEDBACK_COLOR} scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        {t('app.feedback.intro')}
      </Text>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ gap: 8 }}>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
          <Picker selectedValue={type} onValueChange={(v: FeedbackType) => setType(v)}>
            {TYPE_OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={t(opt.label)} value={opt.value} />
            ))}
          </Picker>
        </View>

        <TextInput
          placeholder={t('app.feedback.descriptionPlaceholder')}
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
            <Text>{t('app.feedback.attachImage', { count: attachments.length, max: MAX_ATTACHMENTS })}</Text>
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
              {createFeedback.isPending ? t('app.feedback.submitting') : t('app.feedback.submit')}
            </Text>
          </Pressable>
        </View>
        {attachments.length > 0 ? (
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>{t('app.feedback.longPressToRemove')}</Text>
        ) : null}
      </View>

      <Text style={{ fontWeight: '700', marginTop: 8 }}>{t('app.feedback.yourTickets')}</Text>

      {feedbackQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingTop: 4, paddingBottom: 16 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>{t('app.feedback.empty')}</Text>}
          renderItem={({ item }) => <TicketRow ticket={item} />}
        />
      )}
    </Module>
  );
}
