import { assembleChapters, titleFromFileName } from "./assemble";
import type { ExtractedDocument } from "./types";

export interface PdfOptions {
  /** URL of pdfjs-dist/legacy/build/pdf.worker.min.mjs, served by the host app. */
  workerSrc: string;
}

export async function fromPdfFile(file: File, opts: PdfOptions): Promise<ExtractedDocument> {
  // The legacy build polyfills newer JS APIs (e.g. Map#getOrInsertComputed) that
  // the modern build assumes, which current Chrome releases do not all ship.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = opts.workerSrc;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : "";
      }
      pages.push(pageText);
      page.cleanup();
    }

    const meta = await pdf.getMetadata().catch(() => null);
    const info = meta?.info as { Title?: string } | undefined;
    const { text, sections } = assembleChapters([{ text: pages.join("\n\n") }]);
    if (!text) throw new Error("No text found in this PDF. It may be a scanned image.");

    return {
      title: info?.Title?.trim() || titleFromFileName(file.name),
      text,
      sections,
      sourceType: "file",
      sourceName: file.name,
    };
  } finally {
    await task.destroy();
  }
}
