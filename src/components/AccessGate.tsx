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
      <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold">Subscription inactive</h2>
          <p className="mt-2 text-sm text-stone-600">
            Kinwell — Facility OS is licensed per facility. Activate your
            facility&apos;s subscription to restore dashboard access.
          </p>
          <a
            href={checkoutUrl ?? "https://whop.com"}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Subscribe with Whop
          </a>
        </div>
      </div>
    );
  }

  const tone =
    state === "active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-stone-100 text-stone-500 ring-stone-200";

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset sm:inline-flex ${tone}`}
      title="Facility subscription status, via Whop"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          state === "active" ? "bg-emerald-500" : "bg-stone-400"
        }`}
      />
      {state === "active" ? "Subscription active" : "Whop"}
    </span>
  );
}
