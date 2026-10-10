import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useAuth } from '@/contexts/AuthContext';

export default function HouseIndexScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  return (
    <TileGrid>
      <Module
        tile
        title="View house"
        subtitle="Details & invite code"
        href={householdId ? '/house/view' : ''}
        color="#db2777"
        disabled={!householdId}
      />
      <Module tile title="Create house" subtitle="Start a new house" href="/house/create" color="#c026d3" />
      <Module tile title="Join house" subtitle="Use an invite code" href="/house/join" color="#2563eb" />
      <Module
        tile
        title="Manage house"
        subtitle="Members & roles"
        href={householdId ? '/house/manage' : ''}
        color="#0f766e"
        disabled={!householdId}
      />
      <Module
        tile
        title="Leave house"
        subtitle="Remove yourself"
        href={householdId ? '/house/leave' : ''}
        color="#e11d48"
        disabled={!householdId}
      />
    </TileGrid>
  );
}
