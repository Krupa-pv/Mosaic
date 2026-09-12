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
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] text-stone-400">{hint}</span>
        {allowVoice && voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-pressed={voice.listening}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition ${
              voice.listening
                ? "bg-rose-50 text-rose-700 ring-rose-200"
                : "bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                voice.listening ? "animate-pulse bg-rose-500" : "bg-stone-400"
              }`}
            />
            {voice.listening ? "Listening — tap to stop" : "Dictate"}
          </button>
        )}
      </div>

      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="Paste or dictate the note…"
          className="w-full resize-y rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-[12.5px] leading-relaxed text-stone-700 outline-none focus:border-teal-400 focus:bg-white"
        />

        {voice.error && (
          <p className="mt-2 text-xs text-rose-600">{voice.error}</p>
        )}

        <button
          type="button"
          onClick={onRun}
          disabled={loading || !value.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          )}
          {loading ? "Extracting…" : "Extract"}
        </button>

        {result && (
          <div className="kw-rise mt-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Structured output
              </span>
              {fallback && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                  cached
                </span>
              )}
            </div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-stone-900 p-3 font-mono text-[11.5px] leading-relaxed text-teal-50">
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
