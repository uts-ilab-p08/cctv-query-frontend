"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { QueryField } from "@/components/query/QueryField";
import { Modal } from "@/components/ui/Modal";
import { resultsHref } from "@/lib/routes";
import { QUERY_BOX_TRANSITION } from "@/lib/viewTransition";
import { useAppStore } from "@/store/useAppStore";

interface NewQueryModalProps {
  onClose: () => void;
  /** Edit mode: the draft starts from this query (its cameras and time are part of the
   *  text) and the dialog is titled "Edit query". */
  initialQuery?: string;
}

/** The Home search field, floated over Results. It edits a local draft so the
 *  running query stays untouched until the new search is actually submitted.
 *  Rendered only while open, so every opening starts from a fresh draft (empty, or the
 *  current query when editing) and reloads the recent queries. Its field
 *  takes over the query box's transition name from YOUR QUERY (see QueryPanel). */
export function NewQueryModal({ onClose, initialQuery = "" }: NewQueryModalProps) {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const [draft, setDraft] = useState(initialQuery);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Editing continues where the query ends: the caret goes after the text. A layout
  // effect, so it lands before the Modal's effect focuses the field, which keeps it.
  useLayoutEffect(() => {
    const field = bodyRef.current?.querySelector("textarea");
    field?.setSelectionRange(field.value.length, field.value.length);
  }, []);

  const submit = () => {
    if (!draft.trim()) return;
    // Sets the new query at once: the field settles into YOUR QUERY already showing it.
    void runSearch(draft);
    // Push, not replace: Back returns to the previous search.
    router.push(resultsHref(draft));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initialQuery ? "Edit query" : "New query"}
      variant="bare"
      width={680}
    >
      <div ref={bodyRef}>
        <QueryField
          variant="hero"
          floating
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          transitionName={QUERY_BOX_TRANSITION}
        />
      </div>
      {/* The same one-click re-runs as Home; picking one replaces the running search. */}
      <RecentQueries floating onPick={onClose} className="mt-6" />
    </Modal>
  );
}
