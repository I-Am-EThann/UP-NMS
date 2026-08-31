import { AUTH_COOKIE_NAME } from '../auth/constants';

/**
 * Socket.io handshakes don't go through Express's cookie-parser middleware —
 * we only have the raw `Cookie` header string, so we parse it ourselves.
 * (Deliberately not pulling in the `cookie` npm package for this one simple
 * `key=value; key=value` split — its current release is ESM-only, which
 * fights with this project's CJS Jest setup for no real benefit here.)
 */
export function extractTokenFromHandshake(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name !== AUTH_COOKIE_NAME) continue;
    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}
