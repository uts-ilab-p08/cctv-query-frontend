"use client";

import { History, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QueryListSkeleton } from "@/components/ui/QueryListSkeleton";
import { cn } from "@/lib/cn";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getRecentQueries } from "@/lib/api/endpoints";
import { formatRelativeTime } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { RecentQuery } from "@/types";

/** How many recent queries Home shows. */
const RECENT_LIMIT = 3;

interface RecentQueriesProps {
  /** Called once a query is picked, after its search starts (e.g. to close a dialog). */
  onPick?: () => void;
  /** Over a modal backdrop: the opaque floating surface, like the field above it. */
  floating?: boolean;
  /** Overrides the section's spacing from the field above. */
  className?: string;
}

/** The latest searches, one click to run again: under the field on Home and in the
 *  New query dialog. */
export function RecentQueries({ onPick, floating = false, className }: RecentQueriesProps) {
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
      <section className={cn("mt-14 w-full", className)}>
        <SectionLabel>RECENT QUERIES</SectionLabel>
        <QueryListSkeleton label="Loading recent queries" rows={RECENT_LIMIT} grouped />
      </section>
    );
  }

  // Nothing to show, or the request failed: Home stays clean rather than showing an error.
  if (recentQueries.length === 0) return null;

  return (
    <section className={cn("mt-14 w-full", className)}>
      <SectionLabel>RECENT QUERIES</SectionLabel>
      {/* One card of rows, not a stack of rounded bars: rows shaped like the search field
          read as more search fields. */}
      <ul
        className={cn(
          "rounded-card divide-hairline divide-y overflow-hidden",
          floating ? "glass-panel" : "glass-card-flat",
        )}
      >
        {recentQueries.map((query) => (
          <li key={query.id}>
            <button
              type="button"
              onClick={() => {
                if (runningId) return;
                setRunningId(query.id);
                void runSearch(query.text);
                router.push(resultsHref(query.text));
                onPick?.();
              }}
              aria-busy={runningId === query.id || undefined}
              disabled={runningId !== null}
              className="hover:bg-accent-soft aria-busy:bg-accent-soft flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-[background-color,opacity] duration-150 disabled:cursor-progress disabled:opacity-60 aria-busy:opacity-100"
            >
              <History size={15} strokeWidth={2} className="text-ink-3 shrink-0" aria-hidden />
              <span className="text-ink min-w-0 flex-1 text-sm">{query.text}</span>
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
