const destinations = /^\/(?:discover|opportunities(?:\/[^/?#]+)?|gigs(?:\/[^?#]*)?|feed(?:\/\d+)?|profile|help)(?:[?#].*)?$/;

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || (value.includes('\\') || Array.from(value).some(char => char.charCodeAt(0) <= 32))) return null;
  let url: URL;
  try { url = new URL(value, window.location.origin); } catch { return null; }
  if (url.origin !== window.location.origin || !destinations.test(url.pathname + url.search + url.hash)) return null;
  return url.pathname + url.search + url.hash;
}

export function rememberReturnPath(value: string | null | undefined) {
  const path = safeReturnPath(value);
  if (path) sessionStorage.setItem('earn:return', path);
}

export function consumeReturnPath(): string {
  const path = safeReturnPath(sessionStorage.getItem('earn:return'));
  sessionStorage.removeItem('earn:return');
  return path || '/discover';
}
