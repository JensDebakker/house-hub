import { Picker } from '@react-native-picker/picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { FeedbackAttachmentThumbnail } from '@/components/FeedbackAttachmentThumbnail';
import { FeedbackStatusBadge } from '@/components/FeedbackStatusBadge';
import { Module } from '@/components/Module';
import { getErrorMessage } from '@/lib/api';
import { useAdminFeedbackQuery, useUpdateAdminFeedbackStatusMutation } from '@/lib/useAdminFeedback';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { FeedbackStatus } from '@/types';

const FEEDBACK_COLOR = '#9333ea';
const STATUS_OPTIONS: FeedbackStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminFeedbackDetailScreen() {
  const isAdmin = useRequireAdmin();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketQuery = useAdminFeedbackQuery(isAdmin, id);
  const updateStatus = useUpdateAdminFeedbackStatusMutation();

  if (!isAdmin) {
    return (
      <Module title="Feedback" color={FEEDBACK_COLOR}>
        <Text>You don&apos;t have access to this page.</Text>
      </Module>
    );
  }

  const ticket = ticketQuery.data;

  if (!ticket) {
    return (
      <Module title="Feedback" color={FEEDBACK_COLOR}>
        {ticketQuery.isError ? (
          <Text style={{ color: '#c62828' }}>{getErrorMessage(ticketQuery.error, 'Failed to load ticket.')}</Text>
        ) : (
          <Text>Loading…</Text>
        )}
      </Module>
    );
  }

  const errorMessage = updateStatus.isError ? getErrorMessage(updateStatus.error, 'Failed to update status.') : null;

  return (
    <Module title={ticket.type === 'BUG' ? 'Bug report' : 'Suggestion'} color={FEEDBACK_COLOR}>
      <Link href="/admin/feedback" style={{ color: '#2563eb' }}>
        ← Back to feedback
      </Link>

      <View style={{ gap: 4 }}>
        <Text style={{ color: '#666' }}>
          From {ticket.userDisplayName || ticket.userEmail} ({ticket.userEmail})
        </Text>
        <Text style={{ color: '#999', fontSize: 12 }}>
          Submitted {new Date(ticket.createdAt).toLocaleString()} · Updated {new Date(ticket.updatedAt).toLocaleString()}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '600' }}>Status:</Text>
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
              <Picker.Item key={s} label={s.replace('_', ' ')} value={s} />
            ))}
          </Picker>
        </View>
        {updateStatus.isPending ? <Text style={{ color: '#666' }}>Saving…</Text> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: '600' }}>Description</Text>
        <Text style={{ color: '#374151' }}>{ticket.description}</Text>
      </View>

      {ticket.attachments.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Attachments</Text>
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
