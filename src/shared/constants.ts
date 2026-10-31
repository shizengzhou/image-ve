import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  recursiveSubdirectories: true,
  theme: 'system',
  language: '',
  autoplayIntervalMs: 2000,
  wheelZoomStep: 0.1
};

export const RAW_EXTENSIONS = [
  '3fr',
  'arw',
  'cr2',
  'cr3',
  'crw',
  'dcr',
  'dng',
  'erf',
  'kdc',
  'mef',
  'mos',
  'mrw',
  'nef',
  'nrw',
  'orf',
  'pef',
  'raf',
  'raw',
  'rw2',
  'rwl',
  'sr2',
  'srf',
  'srw',
  'x3f'
];

export const SUPPORTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'tif',
  'tiff',
  'ico',
  'icns',
  'heic',
  'heif',
  'avif',
  'psd',
  'ai',
  ...RAW_EXTENSIONS
];

export const PRODUCT_NAME = 'ImageVE';
