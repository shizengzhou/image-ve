import { isWindows } from './platform';

export const dirname = (path: string): string => {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (index <= 0) {
    return path;
  }
  return path.slice(0, index);
};

export const basename = (path: string): string => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

export const normalizePath = (path: string): string => {
  const normalized = path.replace(/\\/g, '/');
  return isWindows ? normalized.toLowerCase() : normalized;
};
