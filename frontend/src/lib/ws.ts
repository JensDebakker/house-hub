import { BASE_URL } from '@/lib/api';

/**
 * Builds the `/api/ws` URL from the same base URL the REST client uses, swapping
 * http(s) for ws(s) and keeping the host/port/context-path logic identical so this
 * works unchanged in dev and behind the docker/nginx prod proxy.
 */
export function getWebSocketUrl(token: string, houseId?: string): string {
  const base = new URL(BASE_URL);
  const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = base.pathname.endsWith('/') ? base.pathname.slice(0, -1) : base.pathname;

  const params = new URLSearchParams({ token });
  if (houseId) params.set('houseId', houseId);

  return `${protocol}//${base.host}${basePath}/ws?${params.toString()}`;
}
