import { ScrollView, View } from 'react-native';

export const TableContainer = ({ width, children }: { width: number; children: React.ReactNode }) => (
  <ScrollView horizontal>
    <View style={{ width, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>{children}</View>
  </ScrollView>
);
