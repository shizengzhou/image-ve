// ImageMagick (via electron-magickwand) is a stateful native library.
// Running many decode / ping / thumbnail operations concurrently can corrupt
// its internal heap on Windows (ntdll 0xc0000374), so every native call is
// funneled through this single global queue.
let tail: Promise<unknown> = Promise.resolve();

export const runMagick = <T>(task: () => Promise<T>): Promise<T> => {
  const result = tail.then(task, task);
  tail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};
