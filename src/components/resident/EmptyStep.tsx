import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * A step reached before its prerequisite exists — usually after a hard
 * refresh, which empties the in-memory flow state.
 *
 * Deliberately not a redirect: a page that bounces somewhere else
 * mid-recording reads as a crash. This says what's missing and offers
 * one way forward.
 */
export default function EmptyStep({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface p-7">
      <h2 className="display text-lead text-ink">{title}</h2>
      <p className="mt-2 max-w-prose text-body leading-relaxed text-ink-soft">
        {body}
      </p>
      <Link
        href={href}
        className="group mt-5 inline-flex items-center gap-2 text-caption font-medium text-accent hover:underline"
      >
        {cta}
        <ArrowRight
          aria-hidden
          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>
    </section>
  );
}
