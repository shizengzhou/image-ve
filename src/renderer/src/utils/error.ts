export const isPermissionDenied = (detail: string | null): boolean =>
  !!detail &&
  (detail.includes('Operation not permitted') ||
    detail.includes('os error 1') ||
    detail.includes('permission denied') ||
    detail.includes('EPERM') ||
    detail.includes('EACCES'));
