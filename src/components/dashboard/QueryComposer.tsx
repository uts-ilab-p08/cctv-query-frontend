"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActiveFilterChips } from "@/components/dashboard/ActiveFilterChips";
import { KeywordChips } from "@/components/dashboard/KeywordChips";
import { detectKeywords } from "@/lib/keywords";
import { useAppStore } from "@/store/useAppStore";

const modeCopy = {
  nlq: {
    hint: "Type freely — detected keywords will surface as filters below.",
    label: "Natural language mode",
  },
  classic: {
    hint: "Use the Filters button to set search criteria.",
    label: "Classic filters mode",
  },
} as const;

export function QueryComposer() {
  const router = useRouter();
  const searchMode = useAppStore((state) => state.searchMode);
  const storedQuery = useAppStore((state) => state.query);
  const runSearch = useAppStore((state) => state.runSearch);
  const openSettings = useAppStore((state) => state.openSettings);
  const openFilters = useAppStore((state) => state.openFilters);

  const [draft, setDraft] = useState(storedQuery);

  const detected = useMemo(
    () => (searchMode === "nlq" ? detectKeywords(draft) : []),
    [draft, searchMode],
  );

  const submit = () => {
    if (!draft.trim()) return;
    runSearch(draft);
    router.push("/results");
  };

  const copy = modeCopy[searchMode];

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center">
      <h1 className="text-navy mb-2.5 text-center text-[34px] font-bold">
        Query your camera network
      </h1>
      <p className="text-ink-muted mb-2 text-center text-[15px]">{copy.hint}</p>
      <button
        type="button"
        onClick={openSettings}
        className="text-indigo-strong hover:text-navy-deep mb-9 cursor-pointer text-xs transition-colors duration-150"
      >
        {copy.label} · change in settings
      </button>

      <div className="relative w-full">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-center gap-2.5"
        >
          <label htmlFor="query-input" className="sr-only">
            Search the camera network
          </label>
          <input
            id="query-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask anything… e.g. anyone who entered after the red car arrived"
            className="text-ink placeholder:text-ink-subtle focus:border-indigo/50 h-16 flex-1 rounded-2xl border border-white/70 bg-white/75 px-[22px] font-sans text-base shadow-[0_16px_40px_rgba(99,102,241,0.15)] backdrop-blur-[18px] transition-colors duration-150"
          />
          <button
            type="submit"
            className="bg-brand-gradient-strong h-16 shrink-0 cursor-pointer rounded-2xl px-[30px] font-sans text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(67,56,202,0.35)] transition-shadow duration-150 hover:shadow-[0_18px_38px_rgba(67,56,202,0.45)]"
          >
            Search
          </button>
          {searchMode === "classic" ? (
            <button
              type="button"
              onClick={openFilters}
              className="text-ink-muted hover:text-ink h-16 w-16 shrink-0 cursor-pointer rounded-2xl border border-white/70 bg-white/75 font-mono text-[13px] backdrop-blur-[18px] transition-colors duration-150"
            >
              Filters
            </button>
          ) : null}
        </form>

        <KeywordChips keywords={detected} />
      </div>

      <ActiveFilterChips />
    </div>
  );
}
