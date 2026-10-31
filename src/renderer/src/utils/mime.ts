import { fileTypeFromBuffer } from 'file-type';

export const getMime = async (buffer: ArrayBuffer | Uint8Array): Promise<string> => {
  const fileType = await fileTypeFromBuffer(buffer as Uint8Array);

  if (fileType) {
    if (fileType.mime === 'application/xml') {
      return 'image/svg+xml';
    }

    return fileType.mime;
  }

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const text = new TextDecoder().decode(bytes.slice(0, 512));
  if (text.includes('<svg') || text.includes('<?xml')) {
    return 'image/svg+xml';
  }

  return 'application/octet-stream';
};

export const isSvg = (mime: string): boolean => mime === 'image/svg+xml';

export const isWebp = (mime: string): boolean => mime === 'image/webp';

export const isGif = (mime: string): boolean => mime === 'image/gif';

// Formats rendered via <img> tag (supports animation: gif, webp; native: svg)
export const isImgTag = (mime: string): boolean => isSvg(mime) || isWebp(mime) || isGif(mime);
