"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { QueryField } from "@/components/query/QueryField";
import { Modal } from "@/components/ui/Modal";
import { resultsHref } from "@/lib/routes";
import { QUERY_BOX_TRANSITION } from "@/lib/viewTransition";
import { useAppStore } from "@/store/useAppStore";

interface NewQueryModalProps {
  onClose: () => void;
  /** Edit an existing query instead of starting a new one: the draft opens with it —
   *  cameras and time included, since both live in its text. */
  initialQuery?: string;
}

/** The Home search field, floated over Results. It edits a local draft so the
 *  running query stays untouched until the new search is actually submitted.
 *  Rendered only while open, so every opening starts from a fresh draft (empty, or
 *  `initialQuery` when editing) and reloads the recent queries. Its field
 *  takes over the query box's transition name from YOUR QUERY (see QueryPanel). */
export function NewQueryModal({ onClose, initialQuery }: NewQueryModalProps) {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const editing = initialQuery !== undefined;
  const [draft, setDraft] = useState(initialQuery ?? "");

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
      title={editing ? "Edit query" : "New query"}
      variant="bare"
      width={680}
    >
      <QueryField
        variant="hero"
        floating
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        transitionName={QUERY_BOX_TRANSITION}
        caretAtEnd={editing}
      />
      {/* The same one-click re-runs as Home; picking one replaces the running search. */}
      <RecentQueries floating onPick={onClose} className="mt-6" />
    </Modal>
  );
}
