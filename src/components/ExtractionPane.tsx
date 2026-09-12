"use client";

import type { ExtractionResponse } from "@shared/types";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

export default function ExtractionPane({
  title,
  hint,
  value,
  onChange,
  onRun,
  loading,
  result,
  fallback,
  allowVoice = false,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  result: ExtractionResponse | null;
  fallback: boolean;
  allowVoice?: boolean;
}) {
  const voice = useSpeechRecognition((chunk) =>
    onChange(value ? `${value} ${chunk}` : chunk)
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-raised">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-3.5">
        <h3 className="text-[13.5px] font-medium text-ink">{title}</h3>
        <span className="text-[11px] text-faint">{hint}</span>
        {allowVoice && voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-pressed={voice.listening}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition ${
              voice.listening
                ? "bg-high-soft text-high"
                : "bg-line-soft text-ink-soft hover:bg-line"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                voice.listening ? "animate-pulse bg-high" : "bg-faint"
              }`}
            />
            {voice.listening ? "Listening" : "Dictate"}
          </button>
        )}
      </div>

      <div className="p-5">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="Paste or dictate the note…"
          className="w-full resize-y rounded-xl border border-line-soft bg-surface p-3.5 font-mono text-[12px] leading-[1.7] text-ink-soft outline-none transition focus:border-accent/40 focus:bg-raised"
        />

        {voice.error && (
          <p className="mt-2 text-[11.5px] text-high">{voice.error}</p>
        )}

        <button
          type="button"
          onClick={onRun}
          disabled={loading || !value.trim()}
          className="mt-3.5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-medium text-paper transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-30"
        >
          {loading && (
            <span
              aria-hidden
              className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-paper/30 border-t-paper"
            />
          )}
          {loading ? "Extracting…" : "Extract"}
        </button>

        {result && (
          <div className="kw-rise mt-5">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Structured output</span>
              {fallback && (
                <span className="rounded-full bg-mid-soft px-2 py-0.5 text-[9.5px] font-medium text-mid">
                  cached
                </span>
              )}
            </div>
            <pre className="mt-2.5 max-h-64 overflow-auto rounded-xl bg-accent-deep p-4 font-mono text-[11px] leading-[1.7] text-accent-soft">
              {JSON.stringify(stripId(result), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function stripId(r: ExtractionResponse) {
  const { residentId: _residentId, ...rest } = r;
  void _residentId;
  return rest;
}
