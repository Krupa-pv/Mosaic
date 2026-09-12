"use client";

// ============================================================
// PDF → text, in the browser.
//
// Loaded only via dynamic import from extractText.ts. pdf.mjs touches
// DOMMatrix/Path2D at import time, which is undefined during SSR, and
// it's ~350KB that has no business in the initial bundle.
// ============================================================

type PdfModule = typeof import("pdfjs-dist");
let cached: PdfModule | null = null;

async function loadPdfjs(): Promise<PdfModule> {
  if (cached) return cached;

  // Safari 17.0-17.3 lacks Promise.withResolvers, which pdfjs v4 needs.
  const P = Promise as unknown as {
    withResolvers?: <T>() => {
      promise: Promise<T>;
      resolve: (v: T) => void;
      reject: (e: unknown) => void;
    };
  };
  if (typeof P.withResolvers !== "function") {
    P.withResolvers = <T>() => {
      let resolve!: (v: T) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  const mod = (await import("pdfjs-dist/build/pdf.mjs")) as unknown as PdfModule;

  // workerPort, not workerSrc: handing pdfjs an already-constructed Worker
  // lets the bundler resolve the chunk at build time. workerSrc makes it
  // resolve a URL at runtime, which is where Next/Turbopack setups break.
  mod.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
    { type: "module" }
  );

  cached = mod;
  return mod;
}

export async function textFromPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  await doc.destroy();
  return pages.filter(Boolean).join("\n\n");
}
