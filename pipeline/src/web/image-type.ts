/**
 * Tell what kind of image a file is from its first bytes. The name and the
 * type a browser reports are chosen by the sender, so they are not used.
 * Returns null for anything that is not one of the formats the app accepts.
 */
export function detectImageType(data: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
  if (data.length < 12) return null;

  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';

  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  const gifHeader = data.toString('latin1', 0, 6);
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return 'image/gif';

  return null;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/** Decode base64 strictly: null when the text is not base64 at all. */
export function decodeBase64(text: string): Buffer | null {
  const compact = text.replace(/\s+/g, '');
  if (compact.length === 0 || compact.length % 4 === 1 || !BASE64_PATTERN.test(compact)) return null;
  return Buffer.from(compact, 'base64');
}
