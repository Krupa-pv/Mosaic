"use client";

import { useEffect, useState } from "react";
import { staff } from "@/lib/staff";
import { residentsOf } from "@/lib/staff";
import { signIn, useSessionId } from "@/lib/session";
import Avatar from "./ui/Avatar";
import { findResident } from "@/lib/roster";

type Phase = "splash" | "welcome" | "ready";

/**
 * Opening sequence: the mark, then a greeting, then the app.
 *
 * Signed out it stops at the account picker, which is where "one account
 * per care provider" becomes visible — each caregiver has their own
 * residents and their own end-of-day list.
 */
export default function Boot({ children }: { children: React.ReactNode }) {
  const sessionId = useSessionId();
  // Assume already-booted until the effect says otherwise, so a deep
  // link or a refresh mid-shift doesn't sit behind the animation. The
  // sequence is for opening the app, not for every page load.
  const [phase, setPhase] = useState<Phase>("ready");

  const signedIn = staff.find((s) => s.id === sessionId);

  // Keyed on the session, not on mount, so signing back in replays the
  // sequence — otherwise there is no way to see it again short of a new
  // tab, and Boot never unmounts.
  useEffect(() => {
    if (!sessionId) return;

    let booted = true;
    try {
      booted = sessionStorage.getItem("mosaic.booted") === "1";
      sessionStorage.setItem("mosaic.booted", "1");
    } catch {
      /* storage blocked — just skip the animation */
    }
    if (booted) return;

    // Queued rather than set synchronously in the effect body.
    const a = setTimeout(() => setPhase("splash"), 0);
    const b = setTimeout(() => setPhase("welcome"), 1100);
    const c = setTimeout(() => setPhase("ready"), 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [sessionId]);

  // Still resolving storage: hold rather than flashing an account
  // picker at someone who is already signed in.
  if (sessionId === undefined || phase === "splash") {
    return <Splash />;
  }

  if (!signedIn) return <AccountPicker />;

  if (phase === "welcome") {
    return <Welcome name={signedIn.firstName} />;
  }

  return <>{children}</>;
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="kw-fade flex flex-col items-center gap-5">
        <Mark size={72} />
        <p className="display text-headline tracking-tight text-ink">Mosaic</p>
      </div>
    </div>
  );
}

function Welcome({ name }: { name: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="flex flex-col items-center gap-4">
        <span className="kw-fade" style={{ "--kw-delay": "0ms" } as React.CSSProperties}>
          <Mark size={44} />
        </span>
        <p
          className="kw-rise display text-headline text-ink"
          style={{ "--kw-delay": "120ms" } as React.CSSProperties}
        >
          Welcome, {name}
        </p>
        <p
          className="kw-fade text-body text-muted"
          style={{ "--kw-delay": "320ms" } as React.CSSProperties}
        >
          Maple Grove Care Center · Floor 2
        </p>
      </div>
    </div>
  );
}

function AccountPicker() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="kw-rise w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <Mark size={52} />
          <h1 className="display text-headline text-ink">Mosaic</h1>
          <p className="max-w-sm text-body text-muted">
            One account per care provider. Sign in to see the residents
            you&apos;re responsible for.
          </p>
        </div>

        <ul className="mt-8 space-y-3">
          {staff.map((s) => {
            const mine = residentsOf(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => signIn(s.id)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-raised p-5 text-left transition hover:border-accent/50"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-body font-semibold text-accent-deep">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-ink">
                      {s.firstName} {s.lastName}
                    </span>
                    <span className="block text-caption text-muted">
                      {s.role} · {s.shift} shift · {mine.length} residents
                    </span>
                  </span>
                  <span className="flex -space-x-2">
                    {mine.slice(0, 4).map((id) => {
                      const r = findResident(id);
                      return r ? (
                        <Avatar
                          key={id}
                          residentId={id}
                          firstName={r.firstName}
                          lastName={r.lastName}
                          size="xs"
                          ring="raised"
                          letters="first"
                        />
                      ) : null;
                    })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Mark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="1" y="1" width="9.5" height="9.5" rx="2.5" fill="#0f6b4f" />
      <rect x="13.5" y="1" width="9.5" height="9.5" rx="2.5" fill="#0f6b4f" opacity="0.42" />
      <rect x="1" y="13.5" width="9.5" height="9.5" rx="2.5" fill="#0f6b4f" opacity="0.42" />
      <rect x="13.5" y="13.5" width="9.5" height="9.5" rx="2.5" fill="#c23b1c" />
    </svg>
  );
}
