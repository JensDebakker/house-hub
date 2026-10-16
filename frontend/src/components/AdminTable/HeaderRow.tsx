import { View } from 'react-native';
import { rowStyle } from './tableStyles';

export const HeaderRow = ({ children }: { children: React.ReactNode }) => (
  <View style={[rowStyle, { backgroundColor: '#f5f5f5' }]}>{children}</View>
);
