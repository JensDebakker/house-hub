import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';

export default function AdminIndexScreen() {
  return (
    <TileGrid>
      <Module tile title="Users" subtitle="Accounts & roles" href="/admin/users" color="#2563eb" />
      <Module tile title="Houses" subtitle="Households & data" href="/admin/houses" color="#0f766e" />
      <Module tile title="Feedback" subtitle="Triage bug reports & ideas" href="/admin/feedback" color="#9333ea" />
    </TileGrid>
  );
}
