import { View } from 'react-native';

export const Cell = ({ width, children }: { width: number; children: React.ReactNode }) => (
  <View style={{ width, padding: 8, justifyContent: 'center' }}>{children}</View>
);
