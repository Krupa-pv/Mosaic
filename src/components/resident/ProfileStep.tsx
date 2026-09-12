"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useFlowActions, useFlowDocs, useFlowResults } from "./ResidentFlowProvider";
import ExtractionPane from "../ExtractionPane";
import ProfileCard from "../ProfileCard";

export default function ProfileStep() {
  const { carePlanText, intakeText } = useFlowDocs();
  const r = useFlowResults();
  const a = useFlowActions();

  return (
    <>
      <header>
        <h2 className="display text-title leading-tight text-ink">
          Understand who she is
        </h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          Unstructured notes in, structured profile out. Nothing here was typed
          into a form by staff.
        </p>
      </header>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ExtractionPane
          title="Care plan"
          hint="clinical"
          value={carePlanText}
          onChange={a.setCarePlanText}
          onRun={a.runCarePlan}
          loading={r.carePlanLoading}
          result={r.carePlanResult}
          fallback={r.carePlanCached}
        />
        <ExtractionPane
          title="Intake note"
          hint="social · type or dictate"
          value={intakeText}
          onChange={a.setIntakeText}
          onRun={a.runIntake}
          loading={r.intakeLoading}
          result={r.intakeResult}
          fallback={r.intakeCached}
          allowVoice
        />
      </div>

      {r.extracted && (
        <>
          <ProfileCard profile={r.merged} onChange={a.setProfileEdits} />
          <Link
            href={`/residents/${r.residentId}/pair`}
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-caption font-medium text-white transition hover:bg-accent-deep"
          >
            Find a companion for {r.residentName}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </>
      )}
    </>
  );
}
