import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

/**
 * Loads an authenticated file endpoint as a blob URL for use as an <Image> source.
 * Browsers can't attach an Authorization header to a plain <img src>, so the bytes are
 * fetched via the authed axios client and turned into an object URL instead. Web only -
 * blob: URIs aren't valid Image sources on native, so this resolves to null there.
 */
export function useAuthedImage(url: string | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url || Platform.OS !== 'web') {
      setObjectUrl(null);
      return;
    }

    let currentUrl: string | null = null;
    let cancelled = false;

    api.get(url, { responseType: 'blob' }).then(({ data }) => {
      if (cancelled) return;
      currentUrl = URL.createObjectURL(data as Blob);
      setObjectUrl(currentUrl);
    }).catch(() => {
      if (!cancelled) setObjectUrl(null);
    });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [url]);

  return objectUrl;
}
