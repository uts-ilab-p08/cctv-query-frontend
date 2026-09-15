"use client";

import { useRouter } from "next/navigation";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { recentQueries } from "@/data/recentQueries";
import { useAppStore } from "@/store/useAppStore";

export function RecentQueries() {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);

  return (
    <section className="mt-14 w-full">
      <SectionLabel>RECENT QUERIES</SectionLabel>
      <ul className="flex flex-col gap-2.5">
        {recentQueries.map((query) => (
          <li key={query.id}>
            <button
              type="button"
              onClick={() => {
                runSearch(query.text);
                router.push("/results");
              }}
              className="glass rounded-card border-hairline bg-panel shadow-glass-sm hover:border-hairline-strong flex w-full cursor-pointer items-center justify-between border px-4 py-3.5 text-left transition-colors duration-150"
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
