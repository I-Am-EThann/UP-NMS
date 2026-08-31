import { extractTokenFromHandshake } from './handshake-auth.util';

describe('extractTokenFromHandshake', () => {
  it('extracts the auth cookie value from a raw cookie header', () => {
    const token = extractTokenFromHandshake('up_nms_token=abc123; other=xyz');
    expect(token).toBe('abc123');
  });

  it('returns null when the header is undefined', () => {
    expect(extractTokenFromHandshake(undefined)).toBeNull();
  });

  it('returns null when the header has no auth cookie', () => {
    expect(extractTokenFromHandshake('other=xyz; foo=bar')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractTokenFromHandshake('')).toBeNull();
  });

  it('handles a single cookie with no trailing separators', () => {
    expect(extractTokenFromHandshake('up_nms_token=onlyvalue')).toBe(
      'onlyvalue',
    );
  });

  it('decodes a URI-encoded cookie value', () => {
    expect(extractTokenFromHandshake('up_nms_token=abc%2Fdef')).toBe('abc/def');
  });
});
