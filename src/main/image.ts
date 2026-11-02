import { Magick } from 'electron-magickwand/native';
import fs from 'node:fs';
import { extname } from 'node:path';

import { RAW_EXTENSIONS } from '@shared/constants';
import type { ImageSize } from '@shared/types';

import { readIcnsImage } from './icns';
import { renderPdfFirstPage } from './pdf';
import { log } from './logger';

const rawExtensions = new Set(RAW_EXTENSIONS);

// Formats Chromium can render directly (including animated ones)
const directExtensions = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif'
]);

const MAX_DECODED_CACHE = 8;
const decodedCache = new Map<string, { mtimeMs: number; bytes: Buffer }>();

const getCacheKey = async (path: string): Promise<{ key: string; mtimeMs: number }> => {
  const { mtimeMs } = await fs.promises.stat(path);
  return { key: `${path}:${mtimeMs}`, mtimeMs };
};

const touchCache = (key: string, mtimeMs: number, bytes: Buffer): void => {
  decodedCache.delete(key);
  decodedCache.set(key, { mtimeMs, bytes });

  while (decodedCache.size > MAX_DECODED_CACHE) {
    const oldestKey = decodedCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    decodedCache.delete(oldestKey);
  }
};

const convertToJpeg = async (path: string): Promise<Buffer> => {
  const image = new Magick.Image();
  await image.readAsync(path);
  await image.autoOrientAsync();

  const blob = new Magick.Blob();
  await image.writeAsync(blob, 'jpeg');

  return Buffer.from(blob.data());
};

export const decodeImageBytes = async (path: string): Promise<Buffer> => {
  const extension = extname(path).slice(1).toLowerCase();
  const startedAt = Date.now();
  // 先记一条开始日志：如果原生解码卡死，日志里会只有 start 没有 done。
  log('info', `decode start ${extension || '(none)'}`, path);

  try {
    const bytes = await decodeImageBytesInternal(path, extension);
    log(
      'info',
      `decode done ${extension || '(none)'} ${bytes.length}B ${Date.now() - startedAt}ms`,
      path
    );
    return bytes;
  } catch (error) {
    log('error', `decode failed ${extension || '(none)'} ${Date.now() - startedAt}ms`, {
      path,
      error
    });
    throw error;
  }
};

const decodeImageBytesInternal = async (path: string, extension: string): Promise<Buffer> => {
  if (directExtensions.has(extension)) {
    return fs.promises.readFile(path);
  }

  const { key, mtimeMs } = await getCacheKey(path);
  const cached = decodedCache.get(key);
  if (cached && cached.mtimeMs === mtimeMs) {
    decodedCache.delete(key);
    decodedCache.set(key, cached);
    return cached.bytes;
  }

  if (extension === 'ai') {
    const bytes = await renderPdfFirstPage(path, 3000);
    touchCache(key, mtimeMs, bytes);
    return bytes;
  }

  if (extension === 'icns') {
    const bytes = await readIcnsImage(path);
    touchCache(key, mtimeMs, bytes);
    return bytes;
  }

  if (
    extension === 'heic' ||
    extension === 'heif' ||
    extension === 'psd' ||
    extension === 'tif' ||
    extension === 'tiff' ||
    rawExtensions.has(extension)
  ) {
    const bytes = await convertToJpeg(path);
    touchCache(key, mtimeMs, bytes);
    return bytes;
  }

  return fs.promises.readFile(path);
};

export const getImageSize = async (path: string): Promise<ImageSize> => {
  const startedAt = Date.now();
  log('info', 'ping start', path);

  try {
    const image = new Magick.Image();
    await image.pingAsync(path);
    await image.autoOrientAsync();

    const size: ImageSize = {
      width: image.size().width(),
      height: image.size().height()
    };
    log('info', `ping done ${size.width}x${size.height} ${Date.now() - startedAt}ms`, path);
    return size;
  } catch (error) {
    log('error', `ping failed ${Date.now() - startedAt}ms`, { path, error });
    throw error;
  }
};
