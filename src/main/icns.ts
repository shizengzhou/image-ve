import { Icns } from '@fiahfy/icns';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const getPngPixelCount = (buffer: Buffer): number => {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 0;
  }
  return buffer.readUInt32BE(16) * buffer.readUInt32BE(20);
};

// Modern .icns files store their representations as PNG chunks; older files use
// raw ARGB/JPEG2000 which would require a full decoder. The largest PNG chunk
// is a good equivalent of what macOS would render.
export const readIcnsImage = async (path: string): Promise<Buffer> => {
  const data = await readFile(path);
  const images = Icns.from(data).images.map((image) => Buffer.from(image.image));
  const pngs = images
    .filter((image) => image.length >= 24 && image.subarray(0, 8).equals(PNG_SIGNATURE))
    .sort((a, b) => getPngPixelCount(b) - getPngPixelCount(a));

  const largest = pngs[0];
  if (!largest) {
    throw new Error('ICNS file does not contain a PNG image');
  }
  return largest;
};

export const renderIcnsThumbnail = async (path: string, maxSize: number): Promise<Buffer> => {
  const source = await loadImage(await readIcnsImage(path));
  const scale = Math.min(maxSize / source.width, maxSize / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0, width, height);

  return canvas.toBuffer('image/jpeg', 85);
};
