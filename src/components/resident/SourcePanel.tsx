"use client";

import { useRef, useState } from "react";
import { FileText, Mic, Upload } from "lucide-react";
import { isSupported, textFromFile } from "@/lib/extractText";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

/**
 * A source document for extraction: drop a file, paste, or dictate.
 *
 * There is deliberately no JSON output here any more. Staff don't read
 * JSON, and the result now appears as the profile filling itself in.
 */
export default function SourcePanel({
  title,
  hint,
  value,
  onChange,
  onRun,
  loading,
  done,
  allowVoice = false,
  allowUpload = false,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  done: boolean;
  allowVoice?: boolean;
  allowUpload?: boolean;
}) {
  const voice = useSpeechRecognition((chunk) =>
    onChange(value ? `${value} ${chunk}` : chunk)
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  async function ingest(file: File) {
    setError(null);
    if (!isSupported(file.name)) {
      setError("Use a .txt, .md or .pdf — or paste the text below.");
      return;
    }
    setReading(true);
    try {
      const text = await textFromFile(file);
      if (!text.trim()) throw new Error("empty");
      onChange(text);
      setFileName(file.name);
    } catch {
      // Never a dead end: the textarea is right there and already works.
      setError(`Couldn't read ${file.name}. Paste the text instead.`);
    } finally {
      setReading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (!allowUpload) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!allowUpload) return;
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) ingest(f);
      }}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-raised transition ${
        dragging ? "border-accent ring-2 ring-accent/25" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-3.5">
        <FileText aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
        <h3 className="text-body font-medium text-ink">{title}</h3>
        <span className="text-micro text-faint">{hint}</span>

        <div className="ml-auto flex items-center gap-1.5">
          {allowUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.md,.markdown,.rtf,.csv,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) ingest(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full bg-line-soft px-2.5 py-1 text-micro font-medium text-ink-soft transition hover:bg-line"
              >
                <Upload aria-hidden className="h-3 w-3" strokeWidth={2} />
                Upload
              </button>
            </>
          )}
          {allowVoice && voice.supported && (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              aria-pressed={voice.listening}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-medium transition ${
                voice.listening
                  ? "bg-high-soft text-high"
                  : "bg-line-soft text-ink-soft hover:bg-line"
              }`}
            >
              <Mic aria-hidden className="h-3 w-3" strokeWidth={2} />
              {voice.listening ? "Listening" : "Dictate"}
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        <textarea
          value={reading ? "Reading document…" : value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={reading}
          rows={7}
          placeholder={
            allowUpload
              ? "Drop a care plan here, or paste it…"
              : "Paste or dictate the note…"
          }
          className="w-full resize-y rounded-xl border border-line-soft bg-surface p-3.5 font-mono text-caption leading-[1.7] text-ink-soft outline-none transition focus:border-accent/40 focus:bg-raised"
        />

        {fileName && !error && (
          <p className="kw-fade mt-2 flex items-center gap-1.5 text-micro text-accent">
            <FileText aria-hidden className="h-3 w-3" strokeWidth={2} />
            Read from {fileName}
          </p>
        )}
        {error && <p className="mt-2 text-micro text-high">{error}</p>}
        {voice.error && <p className="mt-2 text-micro text-high">{voice.error}</p>}

        <button
          type="button"
          onClick={onRun}
          disabled={loading || reading || !value.trim()}
          className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-caption font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            done
              ? "bg-accent-soft text-accent-deep hover:bg-accent-soft/70"
              : "bg-ink text-paper hover:bg-ink-soft"
          }`}
        >
          {loading && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
            />
          )}
          {loading ? "Reading…" : done ? "Re-read" : "Read this"}
        </button>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-accent-soft/80 text-body font-medium text-accent-deep">
          Drop to read
        </div>
      )}
    </div>
  );
}
