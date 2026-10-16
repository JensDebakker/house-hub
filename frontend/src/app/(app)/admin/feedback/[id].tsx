import { Picker } from '@react-native-picker/picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { FeedbackAttachmentThumbnail } from '@/components/FeedbackAttachmentThumbnail';
import { FeedbackStatusBadge } from '@/components/FeedbackStatusBadge';
import { Module } from '@/components/Module';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { useAdminFeedbackQuery, useUpdateAdminFeedbackStatusMutation } from '@/lib/useAdminFeedback';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { FeedbackStatus } from '@/types';

const FEEDBACK_COLOR = '#9333ea';
const STATUS_OPTIONS: FeedbackStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminFeedbackDetailScreen() {
  const { t, locale } = useTranslation();
  const isAdmin = useRequireAdmin();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketQuery = useAdminFeedbackQuery(isAdmin, id);
  const updateStatus = useUpdateAdminFeedbackStatusMutation();

  if (!isAdmin) {
    return (
      <Module title={t('admin.feedback.title')} color={FEEDBACK_COLOR}>
        <Text>{t('admin.noAccess')}</Text>
      </Module>
    );
  }

  const ticket = ticketQuery.data;

  if (!ticket) {
    return (
      <Module title={t('admin.feedback.title')} color={FEEDBACK_COLOR}>
        {ticketQuery.isError ? (
          <Text style={{ color: '#c62828' }}>{getErrorMessage(ticketQuery.error, t('admin.feedbackDetail.loadFailed'))}</Text>
        ) : (
          <Text>{t('common.loading')}</Text>
        )}
      </Module>
    );
  }

  const errorMessage = updateStatus.isError ? getErrorMessage(updateStatus.error, t('admin.feedbackDetail.updateStatusFailed')) : null;

  return (
    <Module title={ticket.type === 'BUG' ? t('admin.feedbackDetail.titleBug') : t('admin.feedbackDetail.titleSuggestion')} color={FEEDBACK_COLOR}>
      <Link href="/admin/feedback" style={{ color: '#2563eb' }}>
        {t('admin.feedbackDetail.backToFeedback')}
      </Link>

      <View style={{ gap: 4 }}>
        <Text style={{ color: '#666' }}>
          {t('admin.feedbackDetail.from', { name: ticket.userDisplayName || ticket.userEmail, email: ticket.userEmail })}
        </Text>
        <Text style={{ color: '#999', fontSize: 12 }}>
          {t('admin.feedbackDetail.submittedUpdated', {
            submitted: new Date(ticket.createdAt).toLocaleString(locale),
            updated: new Date(ticket.updatedAt).toLocaleString(locale),
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '600' }}>{t('admin.feedbackDetail.statusLabel')}</Text>
        <FeedbackStatusBadge status={ticket.status} />
      </View>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, width: 200 }}>
          <Picker
            selectedValue={ticket.status}
            onValueChange={(status: FeedbackStatus) => updateStatus.mutate({ ticketId: ticket.id, status })}
          >
            {STATUS_OPTIONS.map((s) => (
              <Picker.Item key={s} label={t(`admin.feedback.status.${s}`)} value={s} />
            ))}
          </Picker>
        </View>
        {updateStatus.isPending ? <Text style={{ color: '#666' }}>{t('common.saving')}</Text> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: '600' }}>{t('admin.feedbackDetail.description')}</Text>
        <Text style={{ color: '#374151' }}>{ticket.description}</Text>
      </View>

      {ticket.attachments.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>{t('admin.feedbackDetail.attachments')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {ticket.attachments.map((a) => (
              <FeedbackAttachmentThumbnail
                key={a.id}
                url={`/admin/feedback/${ticket.id}/attachments/${a.id}`}
                filename={a.originalFilename}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Module>
  );
}
