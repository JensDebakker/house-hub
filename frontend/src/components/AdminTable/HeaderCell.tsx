import { Text, View } from 'react-native';

export const HeaderCell = ({ width, children }: { width: number; children?: string }) => (
  <View style={{ width, padding: 8 }}>
    <Text style={{ fontWeight: '700', fontSize: 13 }}>{children}</Text>
  </View>
);
