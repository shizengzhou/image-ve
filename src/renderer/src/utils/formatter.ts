export const formatBytes = (bytes?: number | null): string => {
  if (!bytes && bytes !== 0) {
    return '-';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
};

export const formatDate = (timestamp?: number | null): string => {
  if (!timestamp) {
    return '-';
  }
  return new Date(timestamp).toLocaleString();
};

export const parseCapturedAt = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const iso = normalized.includes('T') ? normalized : normalized.replace(' ', 'T');
  const timestamp = Date.parse(iso);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const formatCapturedAt = (value?: string | null): string | null => {
  const timestamp = parseCapturedAt(value);
  if (timestamp) {
    return formatDate(timestamp);
  }
  return value ?? null;
};

export const getFileName = (path: string): string => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

export const getExtension = (path: string): string => {
  const parts = path.split('.');
  if (parts.length < 2) {
    return '';
  }
  return (parts[parts.length - 1] ?? '').toLowerCase();
};

export const normalizeExtension = (value: string): string => value.toLowerCase();
