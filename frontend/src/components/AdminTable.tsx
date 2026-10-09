import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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

/**
 * Covers every row/detail action button across the admin screens: a filled "Save"-style
 * button (`primary`), a bare red "Delete"/"Remove" link (`danger`), or a bare blue link
 * (`link`, e.g. "Download"). `busy` disables the button and swaps in `busyLabel`; `disabled`
 * disables it without changing the label (e.g. a picker-dependent "Add" button).
 */
export function AdminActionButton({
  onPress,
  label,
  variant = 'primary',
  busy = false,
  disabled = false,
  busyLabel = '…',
  small = false,
  style,
}: {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'danger' | 'link';
  busy?: boolean;
  disabled?: boolean;
  busyLabel?: string;
  /** Row-context buttons use a smaller 13px label to match the table's compact rows. */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = busy || disabled;
  const text = busy ? busyLabel : label;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [saveButtonStyle, style, (isDisabled || pressed) && { opacity: isDisabled ? 0.6 : 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: small ? 13 : undefined }}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [style, (isDisabled || pressed) && { opacity: isDisabled ? 0.5 : 0.6 }]}
    >
      <Text style={{ color: variant === 'danger' ? '#c62828' : '#2563eb', fontSize: small ? 13 : undefined }}>
        {text}
      </Text>
    </Pressable>
  );
}
