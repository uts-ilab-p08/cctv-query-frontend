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
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/60 bg-white/65 px-4 py-3.5 text-left shadow-[0_6px_18px_rgba(11,28,77,0.05)] backdrop-blur-[16px] transition-shadow duration-150 hover:shadow-[0_10px_26px_rgba(11,28,77,0.1)]"
            >
              <span className="text-ink text-sm">{query.text}</span>
              <span className="text-ink-subtle font-mono text-xs">{query.ts}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
