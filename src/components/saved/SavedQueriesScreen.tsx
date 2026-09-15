"use client";

import { useRouter } from "next/navigation";

import { savedQueries } from "@/data/savedQueries";
import { useAppStore } from "@/store/useAppStore";

export function SavedQueriesScreen() {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Saved Queries</h1>
      <p className="text-ink-muted mb-7 text-sm">Bookmarked searches for quick re-run.</p>

      <ul className="flex list-none flex-col gap-3 p-0">
        {savedQueries.map((query) => (
          <li
            key={query.id}
            className="flex items-center justify-between rounded-xl border border-white/60 bg-white/65 px-[18px] py-4 shadow-[0_8px_24px_rgba(11,28,77,0.06)] backdrop-blur-[16px]"
          >
            <div>
              <p className="text-ink mb-1 text-sm">{query.text}</p>
              <p className="text-ink-subtle font-mono text-xs">
                Saved {query.savedOn} · {query.hits} matches last run
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                runSearch(query.text);
                router.push("/results");
              }}
              className="bg-brand-gradient h-9 shrink-0 cursor-pointer rounded-sm px-4 font-sans text-[13px] text-white shadow-[0_6px_16px_rgba(67,56,202,0.3)] transition-shadow duration-150 hover:shadow-[0_10px_24px_rgba(67,56,202,0.4)]"
            >
              Run again
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
