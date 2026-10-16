import type { ViewStyle } from 'react-native';

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
