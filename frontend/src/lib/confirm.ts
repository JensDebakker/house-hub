import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive-action confirmation. `Alert.alert` with buttons is a no-op on
 * react-native-web, so web falls back to `window.confirm` - the same split the admin house
 * delete, chat message delete and files screens already do inline.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
