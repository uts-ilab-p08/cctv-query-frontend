"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { QueryField } from "@/components/query/QueryField";
import { Modal } from "@/components/ui/Modal";
import { resultsHref } from "@/lib/routes";
import { QUERY_BOX_TRANSITION } from "@/lib/viewTransition";
import { useAppStore } from "@/store/useAppStore";

interface NewQueryModalProps {
  onClose: () => void;
}

/** The Home search field, floated over Results. It edits a local draft so the
 *  running query stays untouched until the new search is actually submitted.
 *  Rendered only while open, so every opening starts from an empty draft. Its field
 *  takes over the query box's transition name from YOUR QUERY (see QueryPanel). */
export function NewQueryModal({ onClose }: NewQueryModalProps) {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    // Sets the new query at once: the field settles into YOUR QUERY already showing it.
    void runSearch(draft);
    // Push, not replace: Back returns to the previous search.
    router.push(resultsHref(draft));
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="New query" variant="bare" width={680}>
      <QueryField
        variant="hero"
        floating
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        transitionName={QUERY_BOX_TRANSITION}
      />
    </Modal>
  );
}
