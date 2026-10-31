import { Magick } from 'electron-magickwand/native';
import fs from 'node:fs';
import { extname } from 'node:path';

import type { FileMetadata } from '@shared/types';

import { runMagick } from './magick';

const emptyMetadata = (): FileMetadata => ({
  size: 0,
  modified: null,
  created: null,
  colorSpace: null,
  colorProfile: null,
  imageWidth: null,
  imageHeight: null,
  deviceManufacturer: null,
  deviceModel: null,
  lensModel: null,
  capturedAt: null,
  focalLength: null,
  isoSpeed: null,
  flash: null,
  aperture: null,
  meteringMode: null,
  whiteBalance: null,
  exposureMode: null,
  exposureBias: null,
  exposureTime: null,
  exposureProgram: null,
  longitude: null,
  latitude: null,
  iptcDescription: null
});

type MagickImage = InstanceType<typeof Magick.Image>;

const getProperty = async (image: MagickImage, name: string): Promise<string | null> => {
  try {
    const value = await image.attributeAsync(name);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
};

const getPropertyAny = async (image: MagickImage, names: string[]): Promise<string | null> => {
  for (const name of names) {
    const value = await getProperty(image, name);
    if (value) {
      return value;
    }
  }
  return null;
};

// ImageMagick ColorspaceType enum order (stable for the values used here)
const COLORSPACE_NAMES = [
  'Undefined',
  'CMY',
  'CMYK',
  'GRAY',
  'HCL',
  'HCLp',
  'HSB',
  'HSI',
  'HSL',
  'HSV',
  'HWB',
  'Lab',
  'LCH',
  'LCHab',
  'LCHuv',
  'Log',
  'LMS',
  'Luv',
  'OHTA',
  'Rec601YCbCr',
  'Rec709YCbCr',
  'RGB',
  'scRGB',
  'sRGB',
  'Transparent',
  'xyY',
  'XYZ',
  'YCbCr',
  'YCC',
  'YDbDr',
  'YIQ',
  'YPbPr',
  'YUV',
  'LinearGRAY',
  'Jzazbz',
  'DisplayP3',
  'Adobe98',
  'ProPhoto',
  'Oklab',
  'Oklch',
  'CAT02LMS'
];

const colorspaceName = (value: number): string | null => {
  return COLORSPACE_NAMES[value] ?? `ColorSpace(${value})`;
};

const formatNumber = (value: number): string => {
  let text = value.toFixed(6);
  while (text.includes('.') && text.endsWith('0')) {
    text = text.slice(0, -1);
  }
  if (text.endsWith('.')) {
    text = text.slice(0, -1);
  }
  return text;
};

const formatAperture = (value: number): string => `f/${formatNumber(value)}`;

const formatFocalLength = (value: number): string => `${formatNumber(value)}mm`;

const formatExposureTime = (value: number): string => {
  if (value > 0 && value < 1) {
    const denominator = Math.round(1 / value);
    if (denominator > 0) {
      const rounded = 1 / denominator;
      if (Math.abs(value - rounded) < 0.0001) {
        return `1/${denominator}`;
      }
    }
  }
  return formatNumber(value);
};

const parseFraction = (value: string): number | null => {
  const parts = value.split('/');
  if (parts.length === 2) {
    const numerator = Number.parseFloat(parts[0] as string);
    const denominator = Number.parseFloat(parts[1] as string);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIsoValue = (value: string): string => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? value : String(Math.round(parsed));
};

const parseExposureTime = (value: string): string => {
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 2) {
      const denominator = Math.round(Number.parseFloat(parts[1] as string));
      if (!Number.isNaN(denominator) && denominator > 0) {
        return `1/${denominator}`;
      }
    }
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? value : formatExposureTime(parsed);
};

const mapExifFlash = (code: number): string | null => {
  const map: Record<number, string> = {
    0: 'off',
    1: 'fired',
    5: 'fired, return not detected',
    7: 'fired, return detected',
    8: 'on, did not fire',
    9: 'on, fired',
    13: 'on, return not detected',
    15: 'on, return detected',
    16: 'off, did not fire',
    20: 'off, return not detected',
    24: 'auto, did not fire',
    25: 'auto, fired',
    29: 'auto, fired, return not detected',
    31: 'auto, fired, return detected',
    32: 'no flash function',
    65: 'fired, red-eye',
    69: 'fired, red-eye, return not detected',
    71: 'fired, red-eye, return detected',
    73: 'on, red-eye',
    77: 'on, red-eye, return not detected',
    79: 'on, red-eye, return detected',
    89: 'auto, fired, red-eye',
    93: 'auto, fired, red-eye, return not detected',
    95: 'auto, fired, red-eye, return detected'
  };
  return map[code] ?? null;
};

const mapExifMeteringMode = (code: number): string | null => {
  const map: Record<number, string> = {
    0: 'unknown',
    1: 'average',
    2: 'centerWeightedAverage',
    3: 'spot',
    4: 'multiSpot',
    5: 'pattern',
    6: 'partial',
    255: 'other'
  };
  return map[code] ?? null;
};

const mapExifWhiteBalance = (code: number): string | null => {
  if (code === 0) return 'auto';
  if (code === 1) return 'manual';
  return null;
};

const mapExifExposureMode = (code: number): string | null => {
  if (code === 0) return 'auto';
  if (code === 1) return 'manual';
  if (code === 2) return 'autoBracket';
  return null;
};

const mapExifExposureProgram = (code: number): string | null => {
  const map: Record<number, string> = {
    0: 'notDefined',
    1: 'manual',
    2: 'normalProgram',
    3: 'aperturePriority',
    4: 'shutterPriority',
    5: 'creativeProgram',
    6: 'actionProgram',
    7: 'portraitMode',
    8: 'landscapeMode'
  };
  return map[code] ?? null;
};

const isGpsZero = (value: string): boolean => {
  if (value.includes('deg')) {
    const first = value.split(/\s+/)[0] ?? '';
    const parsed = Number.parseFloat(first);
    return !Number.isNaN(parsed) && Math.abs(parsed) < 1e-10;
  }

  const parts = value.split(',');
  for (const part of parts) {
    const parsed = parseFraction(part.trim());
    if (parsed !== null && Math.abs(parsed) > 1e-10) {
      return false;
    }
  }

  const parsed = Number.parseFloat(value);
  return !Number.isNaN(parsed) && Math.abs(parsed) < 1e-10;
};

const formatGpsValue = (value: string | null, reference: string | null): string | null => {
  if (!value) {
    return null;
  }

  let formatted: string | null = null;

  if (value.includes('/')) {
    const parts = value.split(',');
    if (parts.length >= 3) {
      const degrees = parseFraction(parts[0] as string);
      const minutes = parseFraction(parts[1] as string);
      const seconds = parseFraction(parts[2] as string);
      if (degrees !== null && minutes !== null && seconds !== null) {
        formatted = `${degrees.toFixed(0)}° ${minutes.toFixed(0)}' ${seconds.toFixed(2)}"`;
      }
    }
  }

  if (!formatted) {
    const decimalDegrees = Number.parseFloat(value);
    if (Number.isNaN(decimalDegrees)) {
      return null;
    }
    const degrees = Math.trunc(decimalDegrees);
    const minutesDecimal = Math.abs(decimalDegrees - degrees) * 60;
    const minutes = Math.trunc(minutesDecimal);
    const seconds = (minutesDecimal - minutes) * 60;
    formatted = `${degrees}° ${minutes}' ${seconds.toFixed(2)}"`;
  }

  if (reference && reference.trim().length > 0) {
    return `${formatted} ${reference}`;
  }

  return formatted;
};

const formatGpsDng = (value: string): string => {
  const direction = ['N', 'S', 'E', 'W'].includes(value.slice(-1)) ? value.slice(-1) : ' ';
  const trimmed = value.replace(/[\sNSEW"']+$/g, '');
  const parts = trimmed.split(/[\s°'"]+/);

  const degrees = Math.round(Number.parseFloat(parts[0] ?? '0') || 0);
  const minutes = Math.round(Number.parseFloat(parts[2] ?? '0') || 0);
  const seconds = Number.parseFloat(parts[4] ?? '0') || 0;

  if (seconds > 0) {
    return `${degrees}° ${minutes}' ${seconds.toFixed(0)}" ${direction}`;
  }
  return `${degrees}° ${minutes}' ${direction}`;
};

const getGps = async (
  image: MagickImage,
  valueKeys: string[],
  refKey: string
): Promise<string | null> => {
  const value = await getPropertyAny(image, valueKeys);
  if (!value || isGpsZero(value)) {
    return null;
  }
  if (value.includes('deg')) {
    return formatGpsDng(value);
  }
  const reference = await getProperty(image, refKey);
  return formatGpsValue(value, reference);
};

const pingImage = async (path: string): Promise<MagickImage> => {
  const image = new Magick.Image();
  await image.pingAsync(path);
  await image.autoOrientAsync();
  return image;
};

const readImageMetadataUnsafe = async (path: string): Promise<FileMetadata> => {
  const extension = extname(path).slice(1).toLowerCase();

  // ImageMagick can corrupt its heap when reading some SVG/AI/ICNS files, so
  // these formats are never handed to the native metadata reader.
  if (extension === 'ai' || extension === 'icns' || extension === 'svg') {
    return emptyMetadata();
  }

  const image = await pingImage(path);

  const width = image.size().width();
  const height = image.size().height();

  let colorSpace: string | null = null;
  try {
    colorSpace = colorspaceName(image.colorSpace());
  } catch {
    colorSpace = null;
  }

  const colorProfile = await getProperty(image, 'icc:description');

  const deviceManufacturer = await getPropertyAny(image, [
    'exif:Make',
    'exif:TiffMake',
    'dng:make'
  ]);
  const deviceModel = await getPropertyAny(image, [
    'exif:Model',
    'exif:TiffModel',
    'dng:camera.model.name'
  ]);
  const lensModel = await getProperty(image, 'exif:LensModel');
  const capturedAt = await getPropertyAny(image, ['exif:DateTimeOriginal', 'dng:create.date']);

  const focalRaw = await getPropertyAny(image, ['exif:FocalLength', 'dng:focal.length']);
  const focalLength = focalRaw
    ? formatFocalLength(Number.parseFloat(focalRaw.replace(' mm', '')) || 0)
    : null;

  const isoRaw = await getPropertyAny(image, [
    'exif:PhotographicSensitivity',
    'exif:ISOSpeedRatings'
  ]);
  const isoSpeed = isoRaw ? parseIsoValue(isoRaw) : null;

  const flashRaw = await getProperty(image, 'exif:Flash');
  const flash = flashRaw ? mapExifFlash(Number.parseInt(flashRaw, 10)) : null;

  const apertureRaw = await getPropertyAny(image, ['exif:FNumber', 'dng:f.number']);
  const aperture = apertureRaw
    ? formatAperture(parseFraction(apertureRaw) ?? Number.parseFloat(apertureRaw) ?? 0)
    : null;

  const meteringRaw = await getProperty(image, 'exif:MeteringMode');
  const meteringMode = meteringRaw ? mapExifMeteringMode(Number.parseInt(meteringRaw, 10)) : null;

  const whiteBalanceRaw = await getProperty(image, 'exif:WhiteBalance');
  const whiteBalance = whiteBalanceRaw
    ? mapExifWhiteBalance(Number.parseInt(whiteBalanceRaw, 10))
    : null;

  const exposureModeRaw = await getProperty(image, 'exif:ExposureMode');
  const exposureMode = exposureModeRaw
    ? mapExifExposureMode(Number.parseInt(exposureModeRaw, 10))
    : null;

  const exposureBiasRaw = await getProperty(image, 'exif:ExposureBiasValue');
  const exposureBiasParsed = exposureBiasRaw
    ? (parseFraction(exposureBiasRaw) ?? Number.parseFloat(exposureBiasRaw))
    : null;
  const exposureBias =
    exposureBiasParsed !== null && !Number.isNaN(exposureBiasParsed)
      ? formatNumber(exposureBiasParsed)
      : null;

  const exposureTimeRaw = await getPropertyAny(image, [
    'exif:ExposureTime',
    'exif:ShutterSpeedValue',
    'dng:exposure.time'
  ]);
  const exposureTime = exposureTimeRaw ? parseExposureTime(exposureTimeRaw) : null;

  const exposureProgramRaw = await getProperty(image, 'exif:ExposureProgram');
  const exposureProgram = exposureProgramRaw
    ? mapExifExposureProgram(Number.parseInt(exposureProgramRaw, 10))
    : null;

  const longitude = await getGps(
    image,
    ['exif:GPSLongitude', 'dng:gps.longitude'],
    'exif:GPSLongitudeRef'
  );
  const latitude = await getGps(
    image,
    ['exif:GPSLatitude', 'dng:gps.latitude'],
    'exif:GPSLatitudeRef'
  );

  const iptcDescription =
    (await getProperty(image, 'iptc:Caption-Abstract')) ??
    (await getProperty(image, 'iptc:Caption'));

  return {
    ...emptyMetadata(),
    colorSpace,
    colorProfile,
    imageWidth: width || null,
    imageHeight: height || null,
    deviceManufacturer,
    deviceModel,
    lensModel,
    capturedAt,
    focalLength,
    isoSpeed,
    flash,
    aperture,
    meteringMode,
    whiteBalance,
    exposureMode,
    exposureBias,
    exposureTime,
    exposureProgram,
    longitude,
    latitude,
    iptcDescription
  };
};

const readImageMetadata = (path: string): Promise<FileMetadata> =>
  runMagick(() => readImageMetadataUnsafe(path));

export const readFileMetadata = async (path: string): Promise<FileMetadata> => {
  const stat = await fs.promises.stat(path);

  let imageMetadata: FileMetadata;
  try {
    imageMetadata = await readImageMetadata(path);
  } catch {
    imageMetadata = emptyMetadata();
  }

  return {
    ...imageMetadata,
    size: stat.size,
    modified: stat.mtimeMs || null,
    created: stat.birthtimeMs || null
  };
};
