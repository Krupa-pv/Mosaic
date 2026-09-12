import Link from "next/link";

/** Shown for residents with no care plan or intake note on file. It says
 *  so plainly rather than inventing a profile — the extraction fallback
 *  would otherwise hand back Margaret's data under someone else's name. */
export default function NoProfileYet({ firstName }: { firstName: string }) {
  return (
    <section className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-7">
      <h2 className="display text-lead text-ink">No social profile yet</h2>
      <p className="mt-2 max-w-prose text-body leading-relaxed text-ink-soft">
        Mosaic is tracking {firstName}&apos;s risk signals, but hasn&apos;t
        ingested a care plan or intake note yet. Once those records are
        connected, this page builds a profile and starts recommending
        companions — the same way it does for Margaret Chen.
      </p>
      <Link
        href="/residents/margaret"
        className="mt-5 inline-block text-caption font-medium text-accent underline-offset-4 hover:underline"
      >
        See a completed profile →
      </Link>
    </section>
  );
}
