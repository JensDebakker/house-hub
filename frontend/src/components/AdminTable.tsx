import { ScrollView, Text, View, type ViewStyle } from 'react-native';

export function TableContainer({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <ScrollView horizontal>
      <View style={{ width, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>{children}</View>
    </ScrollView>
  );
}

export function HeaderRow({ children }: { children: React.ReactNode }) {
  return <View style={[rowStyle, { backgroundColor: '#f5f5f5' }]}>{children}</View>;
}

export function Row({ index, children }: { index: number; children: React.ReactNode }) {
  return <View style={[rowStyle, index % 2 === 1 && { backgroundColor: '#fafafa' }]}>{children}</View>;
}

export function HeaderCell({ width, children }: { width: number; children?: string }) {
  return (
    <View style={{ width, padding: 8 }}>
      <Text style={{ fontWeight: '700', fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function Cell({ width, children }: { width: number; children: React.ReactNode }) {
  return <View style={{ width, padding: 8, justifyContent: 'center' }}>{children}</View>;
}

export const rowStyle: ViewStyle = {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
};

export const saveButtonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 6,
  paddingVertical: 8,
  alignItems: 'center' as const,
};
