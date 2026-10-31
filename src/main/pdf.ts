import { createCanvas } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsPromise: Promise<PdfJsModule> | null = null;

const loadPdfjs = (): Promise<PdfJsModule> => {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
};

// Illustrator files from AI 9 onwards embed a PDF stream, so the first page can
// be rendered with pdf.js without Ghostscript or ImageMagick delegates.
export const renderPdfFirstPage = async (path: string, maxDimension: number): Promise<Buffer> => {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await readFile(path));
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    const page = await document.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = maxDimension / Math.max(baseViewport.width, baseViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.max(1, Math.ceil(viewport.width)),
      Math.max(1, Math.ceil(viewport.height))
    );
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport,
      canvas
    } as unknown as Parameters<typeof page.render>[0]).promise;

    return canvas.toBuffer('image/jpeg', 85);
  } finally {
    await loadingTask.destroy();
  }
};
