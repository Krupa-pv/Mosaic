"use client";

import { useEffect, useState } from "react";
import { checkAccess } from "@/lib/api";

// Whop touches exactly two things: checkout, and this access check.
// No resident or clinical data ever goes to Whop — it only ever sees
// the facility's subscription status.
export default function AccessGate() {
  const [state, setState] = useState<"checking" | "active" | "inactive" | "unwired">(
    "checking"
  );

  useEffect(() => {
    let cancelled = false;
    checkAccess().then(({ active, wired }) => {
      if (cancelled) return;
      if (!wired) setState("unwired");
      else setState(active ? "active" : "inactive");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkoutUrl = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL;

  if (state === "inactive") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4">
        <div className="w-full max-w-md rounded-2xl bg-raised p-7 shadow-xl">
          <h2 className="display text-[22px] text-ink">Subscription inactive</h2>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            Mosaic — Facility OS is licensed per facility. Activate your
            facility&apos;s subscription to restore dashboard access.
          </p>
          <a
            href={checkoutUrl ?? "https://whop.com"}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-[13.5px] font-medium text-white transition hover:bg-accent-deep"
          >
            Subscribe with Whop
          </a>
        </div>
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-muted"
      title="Facility subscription status, via Whop"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          state === "active" ? "bg-low" : "bg-faint"
        }`}
      />
      {state === "active" ? "Subscription active · Whop" : "Facility plan · Whop"}
    </span>
  );
}
