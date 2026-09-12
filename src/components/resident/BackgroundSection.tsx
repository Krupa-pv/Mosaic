"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import {
  BACKGROUND_FIELDS,
  setBackgroundField,
  useBackground,
  type Background,
} from "@/lib/background";

/**
 * Life history as short labelled facts, not prose.
 *
 * Each row is read-only until you click it — so the page reads as a
 * profile rather than as a form, but everything is still one click from
 * being corrected.
 */
export default function BackgroundSection({
  residentId,
}: {
  residentId: string;
}) {
  const background = useBackground(residentId);

  return (
    <dl className="divide-y divide-accent/10">
      {BACKGROUND_FIELDS.map((f) => (
        <Row
          key={f.key}
          residentId={residentId}
          field={f.key}
          label={f.label}
          placeholder={f.placeholder}
          value={background[f.key]}
        />
      ))}
    </dl>
  );
}

function Row({
  residentId,
  field,
  label,
  placeholder,
  value,
}: {
  residentId: string;
  field: keyof Background;
  label: string;
  placeholder: string;
  value?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    setBackgroundField(residentId, field, draft);
    setEditing(false);
  }

  return (
    <div className="flex items-baseline gap-4 py-2.5">
      <dt className="w-28 shrink-0 text-micro tracking-wide text-muted uppercase">
        {label}
      </dt>

      {editing ? (
        <dd className="flex flex-1 items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-accent/40 bg-raised px-3 py-1.5 text-caption text-ink outline-none"
          />
          <button
            type="button"
            onClick={commit}
            aria-label={`Save ${label}`}
            className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white"
          >
            <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </dd>
      ) : (
        <dd className="group flex flex-1 items-baseline gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
            className={`flex-1 truncate text-left text-caption transition ${
              value ? "text-ink hover:text-accent" : "text-faint hover:text-accent"
            }`}
          >
            {value ?? `Add ${label.toLowerCase()}`}
          </button>
          <Pencil
            aria-hidden
            className="h-3 w-3 shrink-0 text-faint opacity-0 transition group-hover:opacity-100"
            strokeWidth={2}
          />
        </dd>
      )}
    </div>
  );
}
