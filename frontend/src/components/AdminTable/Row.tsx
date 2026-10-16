import { View } from 'react-native';
import { rowStyle } from './tableStyles';

export const Row = ({ index, children }: { index: number; children: React.ReactNode }) => (
  <View style={[rowStyle, index % 2 === 1 && { backgroundColor: '#fafafa' }]}>{children}</View>
);
