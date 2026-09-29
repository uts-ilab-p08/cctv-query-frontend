"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { getRecentQueries } from "@/lib/api/endpoints";
import { formatRelativeTime } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { RecentQuery } from "@/types";

/** How many recent queries Home shows. */
const RECENT_LIMIT = 3;

export function RecentQueries() {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  // Re-render every minute so "1 min ago" doesn't go stale while Home stays open.
  const now = useNow(60_000);

  useEffect(() => {
    let cancelled = false;
    getRecentQueries(RECENT_LIMIT)
      .then((queries) => {
        if (!cancelled) setRecentQueries(queries.slice(0, RECENT_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setRecentQueries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (recentQueries.length === 0) return null;

  return (
    <section className="mt-14 w-full">
      <SectionLabel>RECENT QUERIES</SectionLabel>
      <ul className="flex flex-col gap-2.5">
        {recentQueries.map((query) => (
          <li key={query.id}>
            <button
              type="button"
              onClick={() => {
                void runSearch(query.text);
                router.push(resultsHref(query.text));
              }}
              className="rounded-card glass-card-flat hover:border-hairline-strong flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors duration-150"
            >
              <span className="text-ink text-sm">{query.text}</span>
              <span className="text-ink-3 shrink-0 font-mono text-xs">
                {formatRelativeTime(query.ts, now)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
