import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useTranslation } from '@/i18n';

export default function AdminIndexScreen() {
  const { t } = useTranslation();
  return (
    <TileGrid>
      <Module tile title={t('admin.users.title')} subtitle={t('admin.index.usersSubtitle')} href="/admin/users" color="#2563eb" />
      <Module tile title={t('admin.houses.title')} subtitle={t('admin.index.housesSubtitle')} href="/admin/houses" color="#0f766e" />
      <Module tile title={t('admin.feedback.title')} subtitle={t('admin.index.feedbackSubtitle')} href="/admin/feedback" color="#9333ea" />
    </TileGrid>
  );
}
