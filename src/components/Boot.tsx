"use client";

import { useEffect, useState } from "react";
import { staff } from "@/lib/staff";
import { residentsOf } from "@/lib/staff";
import { signIn, useSessionId } from "@/lib/session";
import Avatar from "./ui/Avatar";
import { findResident } from "@/lib/roster";

type Phase = "splash" | "gate" | "welcome" | "ready";

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
  const [greeted, setGreeted] = useState<string | null>(null);

  const signedIn = staff.find((s) => s.id === sessionId);

  // The mark plays on every load of the app, before anything is known
  // about who is using it — then it hands over to the account picker, or
  // straight to a greeting if this browser is already signed in.
  //
  // Deliberately not gated on "have they seen it this session". It was,
  // and the effect was that you could essentially never see it again
  // without clearing storage. Moving between pages doesn't replay it —
  // Boot stays mounted across client-side navigation — so this only
  // costs the two seconds on an actual page load.
  useEffect(() => {
    const a = setTimeout(() => setPhase("splash"), 0);
    const b = setTimeout(() => setPhase("gate"), 2300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  // Picking a name moves to the greeting.
  useEffect(() => {
    if (phase !== "gate" || !signedIn) return;
    const name = signedIn.firstName;
    const t = setTimeout(() => {
      setGreeted(name);
      setPhase("welcome");
    }, 0);
    return () => clearTimeout(t);
  }, [phase, signedIn]);

  // The greeting hands over to the app. This has to be its own effect:
  // scheduling it alongside the transition above meant the phase change
  // re-ran that effect, and its cleanup cancelled this very timer — so
  // the app never appeared.
  useEffect(() => {
    if (phase !== "welcome") return;
    const t = setTimeout(() => setPhase("ready"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // Still resolving storage: hold rather than flashing an account
  // picker at someone who is already signed in.
  if (sessionId === undefined || phase === "splash") {
    return <Splash />;
  }

  if (phase === "welcome" && greeted) return <Welcome name={greeted} />;

  // Signed out — including after signing out mid-session — always lands
  // on the picker, which is the whole point of one account per provider.
  if (!signedIn) return <AccountPicker />;

  if (phase === "gate") return <AccountPicker />;

  return <>{children}</>;
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="flex flex-col items-center gap-8">
        <Mark size={132} animate />
        <p
          className="kw-word display text-[clamp(2.5rem,7vw,4.5rem)] leading-none text-ink"
          style={{ "--kw-delay": "620ms" } as React.CSSProperties}
        >
          Mosaic
        </p>
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
          <h1 className="display text-headline text-ink">Welcome</h1>
          <p className="max-w-sm text-body text-muted">
            Select your name to sign in. One account per care provider —
            you&apos;ll see the residents you&apos;re responsible for.
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

function Mark({ size, animate = false }: { size: number; animate?: boolean }) {
  // Tiles land one at a time, then the assembled mark settles.
  const tiles = [
    { x: 1, y: 1, fill: "#0f6b4f", opacity: 1, delay: 0 },
    { x: 13.5, y: 1, fill: "#0f6b4f", opacity: 0.42, delay: 120 },
    { x: 1, y: 13.5, fill: "#0f6b4f", opacity: 0.42, delay: 240 },
    { x: 13.5, y: 13.5, fill: "#c23b1c", opacity: 1, delay: 360 },
  ];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={animate ? "kw-settle" : undefined}
      style={animate ? ({ "--kw-delay": "420ms" } as React.CSSProperties) : undefined}
    >
      {tiles.map((t) => (
        <rect
          key={`${t.x}-${t.y}`}
          x={t.x}
          y={t.y}
          width="9.5"
          height="9.5"
          rx="2.5"
          fill={t.fill}
          opacity={t.opacity}
          className={animate ? "kw-tile" : undefined}
          style={
            animate
              ? ({
                  "--kw-delay": `${t.delay}ms`,
                  "--kw-opacity": t.opacity,
                } as React.CSSProperties)
              : undefined
          }
        />
      ))}
    </svg>
  );
}
