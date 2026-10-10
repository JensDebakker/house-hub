import { useState } from 'react';
import { Platform, Pressable, Share, Text } from 'react-native';
import { buttonStyle } from '@/lib/formStyles';
import { buildInviteLink } from '@/lib/invite';

/** Shares or copies a house's invite link. Native hands off to the OS share sheet; web has
 * no share sheet to hand off to, so it copies to the clipboard instead. */
export function InviteLinkButton({ inviteCode, color }: { inviteCode: string; color: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const link = buildInviteLink(inviteCode);

  const onPress = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        setStatus('Link copied!');
      } else {
        await Share.share({ message: link, url: link });
      }
    } catch {
      setStatus('Could not copy the link.');
    }
  };

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [buttonStyle(color), pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {Platform.OS === 'web' ? 'Copy invite link' : 'Share invite link'}
        </Text>
      </Pressable>
      {status ? <Text style={{ color: '#666', textAlign: 'center' }}>{status}</Text> : null}
    </>
  );
}
