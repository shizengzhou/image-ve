export const revokeObjectUrl = (src: string | null): void => {
  if (!src) {
    return;
  }
  if (src.startsWith('blob:')) {
    URL.revokeObjectURL(src);
  }
};
