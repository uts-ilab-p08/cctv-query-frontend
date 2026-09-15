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
      <p className="text-ink-2 mb-7 text-sm">Bookmarked searches for quick re-run.</p>

      <ul className="flex list-none flex-col gap-3 p-0">
        {savedQueries.map((query) => (
          <li
            key={query.id}
            className="rounded-card glass-card-flat flex items-center justify-between px-[18px] py-4"
          >
            <div>
              <p className="text-ink mb-1 text-sm">{query.text}</p>
              <p className="text-ink-3 font-mono text-xs">
                Saved {query.savedOn} · {query.hits} matches last run
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                runSearch(query.text);
                router.push("/results");
              }}
              className="surface-action shadow-action h-9 shrink-0 cursor-pointer rounded-full px-4 font-sans text-[13px]"
            >
              Run again
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
