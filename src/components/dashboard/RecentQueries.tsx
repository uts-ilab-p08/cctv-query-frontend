"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QueryListSkeleton } from "@/components/ui/QueryListSkeleton";
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
  const [loading, setLoading] = useState(true);
  /** The query picked: it spins until Results replaces this page (loading that route can
   *  take a moment), and the others wait, so a double click can't start two searches. */
  const [runningId, setRunningId] = useState<string | null>(null);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="mt-14 w-full">
        <SectionLabel>RECENT QUERIES</SectionLabel>
        <QueryListSkeleton label="Loading recent queries" rows={RECENT_LIMIT} className="gap-2.5" />
      </section>
    );
  }

  // Nothing to show, or the request failed: Home stays clean rather than showing an error.
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
                if (runningId) return;
                setRunningId(query.id);
                void runSearch(query.text);
                router.push(resultsHref(query.text));
              }}
              aria-busy={runningId === query.id || undefined}
              disabled={runningId !== null}
              className="rounded-card glass-card-flat hover:border-hairline-strong aria-busy:border-accent-line flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-[border-color,opacity] duration-150 disabled:cursor-progress disabled:opacity-60 aria-busy:opacity-100"
            >
              <span className="text-ink text-sm">{query.text}</span>
              {runningId === query.id ? (
                <Loader2
                  size={15}
                  strokeWidth={2.2}
                  className="text-accent-strong shrink-0 animate-spin"
                  aria-hidden
                />
              ) : (
                <span className="text-ink-3 shrink-0 font-mono text-xs">
                  {formatRelativeTime(query.ts, now)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
