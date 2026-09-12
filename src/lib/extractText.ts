"use client";

// ============================================================
// File → plain text, entirely in the browser.
//
// The extraction API takes `rawText`, so converting client-side means
// upload needs no backend change at all: whatever comes out of here
// posts to the same /api/extract/care-plan as typed text.
// ============================================================

export class UnsupportedFile extends Error {}

const TEXT_TYPES = [".txt", ".md", ".markdown", ".rtf", ".csv"];

export function isSupported(name: string): boolean {
  const lower = name.toLowerCase();
  return TEXT_TYPES.some((e) => lower.endsWith(e)) || lower.endsWith(".pdf");
}

export async function textFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (TEXT_TYPES.some((e) => name.endsWith(e))) {
    return stripRtf(await file.text());
  }

  if (name.endsWith(".pdf")) {
    const { textFromPdf } = await import("./pdf");
    return textFromPdf(file);
  }

  throw new UnsupportedFile(
    "That file type isn't supported — use a .txt, .md or .pdf, or paste the text."
  );
}

/** RTF exports from care systems are common; keep only the readable run. */
function stripRtf(s: string): string {
  if (!s.startsWith("{\\rtf")) return s;
  return s
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
}
