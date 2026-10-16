import { Picker } from '@react-native-picker/picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AdminActionButton, Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { Module } from '@/components/Module';
import { useTranslation } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { Household, HouseholdRole, UserDetail } from '@/types';

const USERS_COLOR = '#2563eb';
const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

export default function AdminUserDetailScreen() {
  const { t, locale } = useTranslation();
  const isAdmin = useRequireAdmin();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newHouseholdId, setNewHouseholdId] = useState('');
  const [newRole, setNewRole] = useState<HouseholdRole>('MEMBER');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detailRes, householdsRes] = await Promise.all([
        api.get<UserDetail>(`/admin/users/${id}`),
        api.get<Household[]>('/admin/households'),
      ]);
      setDetail(detailRes.data);
      setAllHouseholds(householdsRes.data);
    } catch (err) {
      setError(getErrorMessage(err, t('admin.userDetail.loadFailed')));
    }
  }, [id, t]);

  useEffect(() => {
    if (!isAdmin || !id) return;
    (async () => {
      await load();
    })();
  }, [isAdmin, id, load]);

  if (!isAdmin) {
    return (
      <Module title={t('admin.userDetail.title')} color={USERS_COLOR}>
        <Text>{t('admin.noAccess')}</Text>
      </Module>
    );
  }

  if (!detail) {
    return (
      <Module title={t('admin.userDetail.title')} color={USERS_COLOR}>
        {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : <Text>{t('common.loading')}</Text>}
      </Module>
    );
  }

  const addToHousehold = async () => {
    if (!newHouseholdId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/households/${newHouseholdId}/members`, { userId: id, role: newRole });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t('admin.userDetail.addMembershipFailed')));
    } finally {
      setBusy(false);
    }
  };

  const removeFromHousehold = async (householdId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/households/${householdId}/members/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t('admin.userDetail.removeMembershipFailed')));
    } finally {
      setBusy(false);
    }
  };

  const joinedIds = new Set(detail.households.map((h) => h.householdId));
  const joinableHouseholds = allHouseholds.filter((h) => !joinedIds.has(h.id));

  return (
    <Module title={detail.displayName} color={USERS_COLOR}>
      <View>
        <Text style={{ color: '#666' }}>{detail.email} · {t(`admin.roles.${detail.role}`)}</Text>
        <Text style={{ color: '#666' }}>
          {t('admin.userDetail.verifiedJoined', {
            verified: detail.emailVerified ? t('common.yes') : t('common.no'),
            date: new Date(detail.createdAt).toLocaleDateString(locale),
          })}
        </Text>
        <Link href="/admin/users" style={{ color: '#2563eb' }}>
          {t('admin.userDetail.backToUsers')}
        </Link>
      </View>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('admin.userDetail.housesHeading')}</Text>
        <TableContainer width={440}>
          <HeaderRow>
            <HeaderCell width={220}>{t('admin.userDetail.columns.house')}</HeaderCell>
            <HeaderCell width={110}>{t('admin.userDetail.columns.role')}</HeaderCell>
            <HeaderCell width={110}>-</HeaderCell>
          </HeaderRow>
          {detail.households.map((h, index) => (
            <Row key={h.householdId} index={index}>
              <Cell width={220}>
                <Link href={`/admin/houses/${h.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                  {h.householdName}
                </Link>
              </Cell>
              <Cell width={110}><Text>{t(`admin.householdRoles.${h.role}`)}</Text></Cell>
              <Cell width={110}>
                <AdminActionButton label={t('common.remove')} variant="danger" onPress={() => removeFromHousehold(h.householdId)} disabled={busy} />
              </Cell>
            </Row>
          ))}
        </TableContainer>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Picker selectedValue={newHouseholdId} onValueChange={setNewHouseholdId} style={{ width: 220 }}>
            <Picker.Item label={t('admin.userDetail.selectHouse')} value="" />
            {joinableHouseholds.map((h) => (
              <Picker.Item key={h.id} label={h.name} value={h.id} />
            ))}
          </Picker>
          <Picker selectedValue={newRole} onValueChange={setNewRole} style={{ width: 130 }}>
            {HOUSEHOLD_ROLES.map((r) => (
              <Picker.Item key={r} label={t(`admin.householdRoles.${r}`)} value={r} />
            ))}
          </Picker>
          <AdminActionButton label={t('admin.userDetail.addToHouse')} onPress={addToHousehold} disabled={busy || !newHouseholdId} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('admin.userDetail.assignedTasksHeading')}</Text>
        <TableContainer width={340}>
          <HeaderRow>
            <HeaderCell width={220}>{t('admin.userDetail.columns.title')}</HeaderCell>
            <HeaderCell width={60}>{t('admin.userDetail.columns.done')}</HeaderCell>
            <HeaderCell width={60}>{t('admin.userDetail.columns.due')}</HeaderCell>
          </HeaderRow>
          {detail.assignedTasks.map((task, index) => (
            <Row key={task.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{task.title}</Text></Cell>
              <Cell width={60}><Text>{task.done ? t('common.yes') : t('common.no')}</Text></Cell>
              <Cell width={60}><Text>{task.dueDate ?? '-'}</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </View>
    </Module>
  );
}
