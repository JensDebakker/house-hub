import { Image, Text, View } from 'react-native';
import { useAuthedImage } from '@/lib/useAuthedImage';

const SIZE = 72;

/**
 * Renders an already-uploaded feedback attachment as a thumbnail, fetched via the authed
 * axios client the same way the profile picture in settings.tsx is displayed. That helper
 * only resolves to an actual image on web (blob: URIs aren't valid Image sources on
 * native) - this falls back to the filename in a plain box on native, same as the rest of
 * this codebase does for authed images rather than inventing a new pattern here.
 */
export function FeedbackAttachmentThumbnail({ url, filename }: { url: string; filename: string }) {
  const imageUrl = useAuthedImage(url);

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={{ width: SIZE, height: SIZE, borderRadius: 8 }} />;
  }

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
      }}
    >
      <Text numberOfLines={2} style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
        {filename}
      </Text>
    </View>
  );
}
