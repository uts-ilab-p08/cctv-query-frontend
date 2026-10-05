"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { QueryField } from "@/components/query/QueryField";
import { resultsHref } from "@/lib/routes";
import { navigateWithTransition, QUERY_BOX_TRANSITION } from "@/lib/viewTransition";
import { useAppStore } from "@/store/useAppStore";

/** SPEC §2 — centred 680px column, hero field, no filter chips on this screen. */
export function QueryComposer() {
  const router = useRouter();
  const query = useAppStore((state) => state.query);
  const runSearch = useAppStore((state) => state.runSearch);
  /** Set once the search is sent: the button spins until Results replaces this page
   *  (loading that route can take a moment), and a second submit is ignored. */
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!query.trim() || submitting) return;
    setSubmitting(true);
    void runSearch(query);
    // The field morphs into Results' YOUR QUERY box.
    navigateWithTransition(router, resultsHref(query));
  };

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center">
      <h1 className="text-ink mb-2.5 text-center text-[44px] leading-[1.1] font-bold">
        Ask your footage
      </h1>
      <p
        className="text-ink-2 mb-9 max-w-[56ch] text-center text-[15px] leading-[1.55]"
        style={{ textWrap: "pretty" }}
      >
        Describe the moment in plain words. Name the cameras to search, like G328, or pick them with
        the camera button. Detected terms can be retuned inline.
      </p>

      <QueryField
        variant="hero"
        onSubmit={submit}
        submitting={submitting}
        transitionName={QUERY_BOX_TRANSITION}
      />
    </div>
  );
}
