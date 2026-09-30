"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QueryField } from "@/components/query/QueryField";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";

const MODE_COPY = {
  nlq: {
    hint: "Describe the moment in plain words. Detected terms become filters you can retune.",
    label: "Natural language mode",
  },
  classic: {
    hint: "Describe the moment, then narrow it with Filters.",
    label: "Classic filters mode",
  },
} as const;

/** SPEC §2 — centred 680px column, hero field, no filter chips on this screen. */
export function QueryComposer() {
  const router = useRouter();
  const searchMode = useAppStore((state) => state.searchMode);
  const query = useAppStore((state) => state.query);
  const runSearch = useAppStore((state) => state.runSearch);
  /** Set once the search is sent: the button spins until Results replaces this page
   *  (loading that route can take a moment), and a second submit is ignored. */
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!query.trim() || submitting) return;
    setSubmitting(true);
    void runSearch(query);
    router.push(resultsHref(query));
  };

  const copy = MODE_COPY[searchMode];

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center">
      <h1 className="text-ink mb-2.5 text-center text-[44px] leading-[1.1] font-bold">
        Ask your footage
      </h1>
      <p
        className="text-ink-2 mb-4 max-w-[56ch] text-center text-[15px] leading-[1.55]"
        style={{ textWrap: "pretty" }}
      >
        {copy.hint}
      </p>
      {/* The current search mode, as a button into Settings where it is changed. */}
      <Link
        href="/settings"
        aria-label={`${copy.label}. Change the search mode in Settings`}
        title="Change the search mode in Settings"
        className="border-hairline text-ink-2 hover:border-accent-line hover:text-ink mb-9 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs no-underline transition-colors duration-150"
      >
        <Settings size={13} strokeWidth={2} aria-hidden className="text-accent-strong" />
        {copy.label}
      </Link>

      <QueryField variant="hero" onSubmit={submit} submitting={submitting} />
    </div>
  );
}
