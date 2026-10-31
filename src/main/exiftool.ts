import fs from 'node:fs';
import { extname } from 'node:path';

import { exiftool } from 'exiftool-vendored';

import { RAW_EXTENSIONS } from '@shared/constants';

type PreviewTagName = 'JpgFromRaw' | 'OtherImage' | 'PreviewImage' | 'ThumbnailImage';

// TIFF-based RAW files (and plain TIFFs) usually contain one or more JPEG
// previews. Extracting those through ExifTool takes milliseconds, while a full
// RAW demosaic through ImageMagick can take 10-20 seconds for high megapixel
// files.
const previewableExtensions = new Set([...RAW_EXTENSIONS, 'tif', 'tiff']);

// Small previews keep sidebar thumbnails fast to decode.
const previewTags: PreviewTagName[] = [
  'OtherImage',
  'PreviewImage',
  'JpgFromRaw',
  'ThumbnailImage'
];

const maxCacheEntries = 12;
const previewCache = new Map<string, Buffer>();

const cachePreview = (key: string, preview: Buffer): void => {
  previewCache.delete(key);
  previewCache.set(key, preview);
  while (previewCache.size > maxCacheEntries) {
    const oldestKey = previewCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    previewCache.delete(oldestKey);
  }
};

export const extractEmbeddedPreview = async (path: string): Promise<Buffer | null> => {
  const extension = extname(path).slice(1).toLowerCase();
  if (!previewableExtensions.has(extension)) {
    return null;
  }

  let cacheKey: string;
  try {
    const { mtimeMs } = await fs.promises.stat(path);
    cacheKey = `${path}:${mtimeMs}`;
  } catch {
    return null;
  }

  const cached = previewCache.get(cacheKey);
  if (cached) {
    // Refresh recency for the LRU eviction above.
    previewCache.delete(cacheKey);
    previewCache.set(cacheKey, cached);
    return cached;
  }

  for (const tag of previewTags) {
    try {
      const data = await exiftool.extractBinaryTagToBuffer(tag, path);
      if (data.length === 0) {
        continue;
      }
      cachePreview(cacheKey, data);
      return data;
    } catch {
      // The tag does not exist in this file, try the next candidate.
    }
  }

  return null;
};

let isStopping = false;

export const stopExiftool = async (): Promise<void> => {
  if (isStopping) {
    return;
  }
  isStopping = true;
  try {
    await exiftool.end();
  } catch {
    // The worker may already be gone during shutdown.
  }
};
