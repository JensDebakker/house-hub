import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { saveButtonStyle } from './styles';

/**
 * Covers every row/detail action button across the admin screens: a filled "Save"-style
 * button (`primary`), a bare red "Delete"/"Remove" link (`danger`), or a bare blue link
 * (`link`, e.g. "Download"). `busy` disables the button and swaps in `busyLabel`; `disabled`
 * disables it without changing the label (e.g. a picker-dependent "Add" button).
 */
export const AdminActionButton = ({
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
}) => {
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
};
