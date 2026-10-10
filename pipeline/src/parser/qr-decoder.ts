/**
 * Find and decode a QR code in an image.
 *
 * QR codes are a common way to hide a scam link: the user cannot read the
 * address before scanning. Decoding it here lets the link go through the same
 * checks as a link typed in the message.
 */

interface RgbaImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function decodeToRgba(buffer: Buffer): RgbaImage | null {
  // PNG signature: 89 50 4E 47
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PNG } = require('pngjs');
    const png = PNG.sync.read(buffer);
    return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
  }

  // JPEG signature: FF D8
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jpeg = require('jpeg-js');
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 256 });
    return { data: new Uint8ClampedArray(decoded.data), width: decoded.width, height: decoded.height };
  }

  return null;
}

/**
 * Text of the QR code in the image, or an empty list when there is none (or
 * the image format is not PNG/JPEG). Never throws.
 */
export function decodeQrCodes(imageBase64: string): string[] {
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '');
    if (cleanBase64.length < 100) return [];

    const image = decodeToRgba(Buffer.from(cleanBase64, 'base64'));
    if (!image) return [];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsQR = require('jsqr');
    const decode = typeof jsQR === 'function' ? jsQR : jsQR.default;
    const result = decode(image.data, image.width, image.height);

    const text = result && typeof result.data === 'string' ? result.data.trim() : '';
    return text ? [text] : [];
  } catch {
    return [];
  }
}
