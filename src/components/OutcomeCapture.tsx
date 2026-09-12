"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { recordOutcome, type Outcome } from "@/lib/accepted";
import { addObservation, type Sentiment } from "@/lib/observations";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

/**
 * End-of-day feedback.
 *
 * Three buttons was too thin: "went well" tells you nothing you can act
 * on, and it's the sentence underneath — "they talked about her garden
 * the whole time" — that later becomes a profile suggestion. So the
 * outcome is still one tap, and the note is optional but prompted, with
 * dictation for staff on their feet.
 */

const OUTCOMES: { key: Outcome; label: string; tone: string }[] = [
  { key: "went_well", label: "Went well", tone: "bg-low text-white" },
  { key: "follow_up", label: "Needs follow-up", tone: "bg-mid text-white" },
  { key: "did_not_happen", label: "Didn't happen", tone: "bg-muted text-white" },
];

const SENTIMENT: Record<Outcome, Sentiment> = {
  went_well: "went_well",
  follow_up: "follow_up",
  did_not_happen: "didnt_happen",
};

// Prompts that get a specific answer rather than "fine".
const PROMPTS: Record<Outcome, string[]> = {
  went_well: [
    "What did they talk about?",
    "Who did they sit with?",
    "Would they go again?",
  ],
  follow_up: ["What went wrong?", "Too loud or too busy?", "Did they leave early?"],
  did_not_happen: ["Were they unwell?", "Did they decline?", "Was it cancelled?"],
};

export default function OutcomeCapture({
  residentId,
  eventId,
  current,
  companionName,
}: {
  residentId: string;
  eventId: string;
  current?: Outcome;
  companionName?: string;
}) {
  const [outcome, setOutcome] = useState<Outcome | undefined>(current);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const voice = useSpeechRecognition((chunk) =>
    setNote((n) => (n ? `${n} ${chunk}` : chunk))
  );

  function choose(o: Outcome) {
    setOutcome(o);
    setSaved(false);
    recordOutcome(eventId, residentId, o);
  }

  function save() {
    if (!outcome) return;
    addObservation({
      residentId,
      eventId,
      sentiment: SENTIMENT[outcome],
      text: note.trim() || OUTCOMES.find((o) => o.key === outcome)!.label,
    });
    setNote("");
    setSaved(true);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={outcome === o.key}
            onClick={() => choose(o.key)}
            className={`rounded-lg px-3.5 py-2 text-caption transition ${
              outcome === o.key
                ? o.tone
                : "bg-surface text-ink-soft ring-1 ring-inset ring-line hover:bg-line-soft"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {outcome && !saved && (
        <div className="kw-fade mt-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {PROMPTS[outcome].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNote((n) => (n ? n : `${p} `))}
                className="rounded-full bg-raised px-2.5 py-1 text-micro text-muted ring-1 ring-inset ring-line transition hover:text-accent"
              >
                {p}
              </button>
            ))}
            {voice.supported && (
              <button
                type="button"
                onClick={voice.listening ? voice.stop : voice.start}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-medium transition ${
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

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={
              companionName
                ? `Anything worth remembering about them and ${companionName}?`
                : "Anything worth remembering?"
            }
            className="mt-3 w-full resize-y rounded-lg border border-line-soft bg-raised p-3 text-caption text-ink-soft outline-none transition focus:border-accent/40"
          />

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-accent px-3.5 py-2 text-caption font-medium text-white transition hover:bg-accent-deep"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={save}
              className="text-caption text-muted transition hover:text-ink"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {saved && (
        <p className="kw-fade mt-3 text-caption text-accent">
          Logged. Mosaic reads these back for profile suggestions.
        </p>
      )}
    </div>
  );
}
