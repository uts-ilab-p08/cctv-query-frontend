"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QueryField } from "@/components/query/QueryField";
import { EXAMPLE_QUESTIONS } from "@/lib/exampleQuestions";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";

/** The index matches events by what happens in them, so these are the levers to rephrase. */
const TIPS = [
  { label: "Describe the action", example: "a person gets out of a car" },
  { label: "Name the objects", example: "a bag, a van, a bicycle" },
  { label: "Say the place", example: "the school parking lot, the bus stop" },
];

interface NoMatchesProps {
  /** The search that found nothing, as submitted (not the draft being edited). */
  searched: string;
}

/**
 * Results for a search that matched nothing: say so plainly, explain how the search works,
 * and let the investigator try other words right here, starting from their last search.
 */
export function NoMatches({ searched }: NoMatchesProps) {
  const router = useRouter();
  const draft = useAppStore((state) => state.query);
  const runSearch = useAppStore((state) => state.runSearch);
  /** Set once sent: the button spins until the new search replaces this screen. */
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const next = draft.trim();
    if (!next || submitting) return;
    setSubmitting(true);
    void runSearch(next);
    router.push(resultsHref(next));
  };

  const examples = EXAMPLE_QUESTIONS.filter((question) => question !== searched).slice(0, 3);

  return (
    <section
      aria-labelledby="no-matches-title"
      className="mx-auto flex w-full max-w-[680px] flex-col items-center px-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="border-accent-line bg-accent-soft text-accent-strong mb-5 flex size-14 items-center justify-center rounded-full border"
      >
        <SearchX size={24} strokeWidth={1.8} />
      </span>
      <h2 id="no-matches-title" className="text-ink mb-2 text-[24px] font-bold">
        No matching moments
      </h2>
      <p className="text-ink-2 mb-1 max-w-[56ch] text-[15px] leading-[1.6]">
        Nothing in the indexed footage matched <span className="text-ink">“{searched}”</span>.
      </p>
      <p
        className="text-ink-2 mb-8 max-w-[56ch] text-[15px] leading-[1.6]"
        style={{ textWrap: "pretty" }}
      >
        The search finds events by what happens in them. Try other words for the action, the objects
        involved or the place.
      </p>

      <div className="mb-8 w-full">
        <QueryField variant="hero" onSubmit={submit} submitting={submitting} />
      </div>

      <ul
        aria-label="Search tips"
        className="mb-8 grid w-full list-none gap-2.5 p-0 text-left sm:grid-cols-3"
      >
        {TIPS.map((tip) => (
          <li key={tip.label} className="glass-card-flat rounded-xl px-3.5 py-3">
            <p className="text-ink mb-1 text-[13px] font-semibold">{tip.label}</p>
            <p className="text-ink-2 text-[12px] leading-[1.45]">“{tip.example}”</p>
          </li>
        ))}
      </ul>

      <p className="text-ink-3 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
        OR TRY ONE OF THESE
      </p>
      <ul
        aria-label="Example searches"
        className="flex list-none flex-wrap justify-center gap-2 p-0"
      >
        {examples.map((question) => (
          <li key={question}>
            <Link
              href={resultsHref(question)}
              className="border-hairline text-ink-2 hover:border-accent-line hover:text-ink inline-block rounded-full border px-3 py-1.5 text-[13px] no-underline transition-colors duration-150"
            >
              {question}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
