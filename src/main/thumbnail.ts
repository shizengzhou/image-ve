import { app, shell } from 'electron';
import { Magick } from 'electron-magickwand/native';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import { extname, join } from 'node:path';
import { XXHash64 } from 'xxhash-addon';

import type { CacheStats } from '@shared/types';

import { extractEmbeddedPreview } from './exiftool';
import { runMagick } from './magick';
import { renderIcnsThumbnail } from './icns';
import { renderPdfFirstPage } from './pdf';
import { log } from './logger';

// Formats Chromium can display without ImageMagick delegates.
const browserRenderableExtensions = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'ico',
  'avif'
]);

const createCanvasThumbnail = async (source: string | Buffer, maxSize: number): Promise<Buffer> => {
  const image = await loadImage(source);
  const scale = Math.min(maxSize / image.width, maxSize / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toBuffer('image/jpeg', 85);
};

const SEED = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);

const getThumbnailCachePath = (): string => join(app.getPath('userData'), 'thumbnails');

const ensureCacheDirectory = (): string => {
  const cachePath = getThumbnailCachePath();
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
  return cachePath;
};

const getThumbnailCacheKey = (path: string, maxSize: number, modified: number): string => {
  const hasher = new XXHash64(SEED);

  hasher.update(Buffer.from(path, 'utf8'));

  const maxBuf = Buffer.alloc(4);
  maxBuf.writeUInt32BE(maxSize >>> 0, 0);
  hasher.update(maxBuf);

  const modBuf = Buffer.alloc(8);
  modBuf.writeBigUInt64BE(BigInt(Math.round(modified ?? 0)), 0);
  hasher.update(modBuf);

  return hasher.digest().readBigUInt64BE(0).toString();
};

const createThumbnail = async (path: string, maxSize: number): Promise<Buffer> => {
  const extension = extname(path).slice(1).toLowerCase();

  if (extension === 'icns') {
    return renderIcnsThumbnail(path, maxSize);
  }

  if (extension === 'ai') {
    return renderPdfFirstPage(path, maxSize);
  }

  // RAW/TIFF files embed small JPEG previews; rasterizing those avoids a
  // multi-second full RAW decode for every sidebar entry.
  const preview = await extractEmbeddedPreview(path);
  if (preview) {
    try {
      return await createCanvasThumbnail(preview, maxSize);
    } catch {
      // Fall through to ImageMagick if the embedded preview cannot be decoded.
    }
  }

  return runMagick(async () => {
    const image = new Magick.Image();
    await image.readAsync(path);
    await image.autoOrientAsync();
    await image.thumbnailAsync(`${maxSize}x${maxSize}`);

    const blob = new Magick.Blob();
    await image.writeAsync(blob, 'jpeg');

    return Buffer.from(blob.data());
  });
};

export const getThumbnail = async (path: string, maxSize: number): Promise<Buffer> => {
  const extension = extname(path).slice(1).toLowerCase();
  const startedAt = Date.now();
  const usesNativeDecoder = extension !== 'svg' && !browserRenderableExtensions.has(extension);

  // 需要走原生解码的格式先记开始日志，卡死时能看出是谁开的口子。
  if (usesNativeDecoder) {
    log('info', `thumbnail start ${extension} ${maxSize}px`, path);
  }

  try {
    const thumbnail = await getThumbnailInternal(path, maxSize);
    const elapsed = Date.now() - startedAt;
    if (usesNativeDecoder || elapsed >= 500) {
      log('info', `thumbnail done ${extension} ${thumbnail.length}B ${elapsed}ms`, path);
    }
    return thumbnail;
  } catch (error) {
    log('error', `thumbnail failed ${extension} ${Date.now() - startedAt}ms`, { path, error });
    throw error;
  }
};

const getThumbnailInternal = async (path: string, maxSize: number): Promise<Buffer> => {
  const extension = extname(path).toLowerCase();

  if (extension === '.svg') {
    return fs.promises.readFile(path);
  }

  const cacheDirectory = ensureCacheDirectory();
  const { mtimeMs } = await fs.promises.stat(path);
  const cacheKey = getThumbnailCacheKey(path, maxSize, mtimeMs);
  const cacheFile = join(cacheDirectory, `${cacheKey}.jpg`);

  if (fs.existsSync(cacheFile)) {
    return fs.promises.readFile(cacheFile);
  }

  const thumbnail = await createThumbnail(path, maxSize).catch(async (error) => {
    const ext = extname(path).slice(1).toLowerCase();
    if (!browserRenderableExtensions.has(ext)) {
      throw error;
    }
    // Formats unsupported by the bundled ImageMagick (e.g. some AVIF/WebP
    // variants) fall back to Skia, then to the original bytes so Chromium can
    // scale them in the sidebar.
    try {
      return await createCanvasThumbnail(path, maxSize);
    } catch {
      return fs.promises.readFile(path);
    }
  });
  await fs.promises.writeFile(cacheFile, thumbnail);

  return thumbnail;
};

export const getThumbnailCacheStats = async (): Promise<CacheStats> => {
  const cacheDirectory = ensureCacheDirectory();
  let bytes = 0;
  let count = 0;

  const entries = await fs.promises.readdir(cacheDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const stat = await fs.promises.stat(join(cacheDirectory, entry.name));
    bytes += stat.size;
    count += 1;
  }

  return { bytes, count, path: cacheDirectory };
};

export const clearThumbnailCache = async (): Promise<CacheStats> => {
  const cacheDirectory = ensureCacheDirectory();

  const entries = await fs.promises.readdir(cacheDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      await fs.promises.unlink(join(cacheDirectory, entry.name));
    }
  }

  return getThumbnailCacheStats();
};

export const revealInThumbnailCache = async (path: string): Promise<void> => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
  shell.showItemInFolder(path);
};
