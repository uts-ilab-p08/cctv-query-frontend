"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { getRecentQueries } from "@/lib/api/endpoints";
import { useAppStore } from "@/store/useAppStore";
import type { RecentQuery } from "@/types";

export function RecentQueries() {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);

  useEffect(() => {
    let cancelled = false;
    getRecentQueries()
      .then((queries) => {
        if (!cancelled) setRecentQueries(queries);
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
                router.push("/results");
              }}
              className="rounded-card glass-card-flat hover:border-hairline-strong flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors duration-150"
            >
              <span className="text-ink text-sm">{query.text}</span>
              <span className="text-ink-3 font-mono text-xs">{query.ts}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
