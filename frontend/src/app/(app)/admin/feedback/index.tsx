import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { FeedbackStatusBadge } from '@/components/FeedbackStatusBadge';
import { Module } from '@/components/Module';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { useAdminFeedbackListQuery } from '@/lib/useAdminFeedback';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { FeedbackStatus, FeedbackType } from '@/types';

const FEEDBACK_COLOR = '#9333ea';

const STATUS_FILTERS: (FeedbackStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TYPE_FILTERS: (FeedbackType | 'ALL')[] = ['ALL', 'BUG', 'SUGGESTION'];

const COLS = {
  submitter: 200,
  type: 100,
  description: 300,
  status: 130,
  created: 160,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

export default function AdminFeedbackListScreen() {
  const { t, locale } = useTranslation();
  const isAdmin = useRequireAdmin();
  const feedbackQuery = useAdminFeedbackListQuery(isAdmin);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const tickets = feedbackQuery.data ?? [];
    const query = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (!query) return true;
      return (
        t.description.toLowerCase().includes(query) ||
        t.userEmail.toLowerCase().includes(query) ||
        t.userDisplayName.toLowerCase().includes(query)
      );
    });
  }, [feedbackQuery.data, search, statusFilter, typeFilter]);

  if (!isAdmin) {
    return (
      <Module title={t('admin.feedback.title')} color={FEEDBACK_COLOR}>
        <Text>{t('admin.noAccess')}</Text>
      </Module>
    );
  }

  const errorMessage = feedbackQuery.isError ? getErrorMessage(feedbackQuery.error, t('admin.feedback.loadFailed')) : null;

  return (
    <Module title={t('admin.feedback.title')} color={FEEDBACK_COLOR}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('admin.feedback.searchPlaceholder')}
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, backgroundColor: 'white' }}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 }}>
          <Picker selectedValue={statusFilter} onValueChange={(v: FeedbackStatus | 'ALL') => setStatusFilter(v)}>
            {STATUS_FILTERS.map((s) => (
              <Picker.Item key={s} label={s === 'ALL' ? t('admin.feedback.allStatuses') : t(`admin.feedback.status.${s}`)} value={s} />
            ))}
          </Picker>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 }}>
          <Picker selectedValue={typeFilter} onValueChange={(v: FeedbackType | 'ALL') => setTypeFilter(v)}>
            {TYPE_FILTERS.map((type) => (
              <Picker.Item key={type} label={type === 'ALL' ? t('admin.feedback.allTypes') : t(`admin.feedback.typeFilter.${type}`)} value={type} />
            ))}
          </Picker>
        </View>
      </View>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      {feedbackQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <TableContainer width={TABLE_WIDTH}>
          <HeaderRow>
            <HeaderCell width={COLS.submitter}>{t('admin.feedback.columns.submitter')}</HeaderCell>
            <HeaderCell width={COLS.type}>{t('admin.feedback.columns.type')}</HeaderCell>
            <HeaderCell width={COLS.description}>{t('admin.feedback.columns.description')}</HeaderCell>
            <HeaderCell width={COLS.status}>{t('admin.feedback.columns.status')}</HeaderCell>
            <HeaderCell width={COLS.created}>{t('admin.feedback.columns.submitted')}</HeaderCell>
          </HeaderRow>

          {filtered.map((ticket, index) => (
            <Row key={ticket.id} index={index}>
              <Cell width={COLS.submitter}>
                <Link href={`/admin/feedback/${ticket.id}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                  {ticket.userDisplayName || ticket.userEmail}
                </Link>
              </Cell>
              <Cell width={COLS.type}>
                <Text>{t(`admin.feedback.type.${ticket.type}`)}</Text>
              </Cell>
              <Cell width={COLS.description}>
                <Text numberOfLines={2} style={{ color: '#666' }}>{ticket.description}</Text>
              </Cell>
              <Cell width={COLS.status}>
                <FeedbackStatusBadge status={ticket.status} />
              </Cell>
              <Cell width={COLS.created}>
                <Text style={{ color: '#666' }}>{new Date(ticket.createdAt).toLocaleDateString(locale)}</Text>
              </Cell>
            </Row>
          ))}
        </TableContainer>
      )}
    </Module>
  );
}
