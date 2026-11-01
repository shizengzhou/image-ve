import electronLog from 'electron-log/main';

electronLog.initialize();
electronLog.transports.file.level = 'info';

export const getLogFilePath = (): string => electronLog.transports.file.getFile().path;

export const log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown): void => {
  switch (level) {
    case 'error':
      if (detail === undefined) {
        electronLog.error(message);
      } else {
        electronLog.error(message, detail);
      }
      break;
    case 'warn':
      if (detail === undefined) {
        electronLog.warn(message);
      } else {
        electronLog.warn(message, detail);
      }
      break;
    default:
      if (detail === undefined) {
        electronLog.info(message);
      } else {
        electronLog.info(message, detail);
      }
  }
};
