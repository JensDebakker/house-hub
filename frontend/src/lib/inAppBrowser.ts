/** True when the page is running inside Facebook/Messenger/Instagram's in-app browser -
 * a stripped-down WebView that's known to throttle or fully suspend JS execution once it's
 * not the foreground view, which is how a page like `/join` can get stuck mid-load with no
 * way for the user to tell what went wrong (see the join-link stuck-spinner incident). */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram/i.test(navigator.userAgent);
}
