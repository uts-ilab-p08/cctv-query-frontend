"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { QueryField } from "@/components/query/QueryField";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";

const MODE_COPY = {
  nlq: {
    hint: "Type freely — detected terms become filters you can retune inline.",
    label: "Natural language mode",
  },
  classic: {
    hint: "Use the Filters button to set search criteria.",
    label: "Classic filters mode",
  },
} as const;

/** SPEC §2 — centred 680px column, hero field, no filter chips on this screen. */
export function QueryComposer() {
  const router = useRouter();
  const searchMode = useAppStore((state) => state.searchMode);
  const query = useAppStore((state) => state.query);
  const runSearch = useAppStore((state) => state.runSearch);

  const submit = () => {
    if (!query.trim()) return;
    void runSearch(query);
    router.push(resultsHref(query));
  };

  const copy = MODE_COPY[searchMode];

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center">
      <h1 className="text-ink mb-2.5 text-center text-[44px] leading-[1.1] font-bold">
        Query your camera network
      </h1>
      <p className="text-ink-2 mb-2 text-center text-[15px]">{copy.hint}</p>
      <Link
        href="/settings"
        className="text-accent hover:text-accent-strong mb-9 text-xs no-underline transition-colors duration-150"
      >
        {copy.label} · change in settings
      </Link>

      <QueryField variant="hero" onSubmit={submit} />
    </div>
  );
}
