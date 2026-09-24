"use client";

import { useState } from "react";

import { QueryField } from "@/components/query/QueryField";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/useAppStore";

interface NewQueryModalProps {
  open: boolean;
  onClose: () => void;
}

/** The Home search field, floated over Results. It edits a local draft so the
 *  running query stays untouched until the new search is actually submitted. */
export function NewQueryModal({ open, onClose }: NewQueryModalProps) {
  const runSearch = useAppStore((state) => state.runSearch);
  const [draft, setDraft] = useState("");

  const close = () => {
    setDraft("");
    onClose();
  };

  const submit = () => {
    if (!draft.trim()) return;
    void runSearch(draft);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="New query" variant="bare" width={680}>
      <QueryField variant="hero" floating value={draft} onChange={setDraft} onSubmit={submit} />
    </Modal>
  );
}
