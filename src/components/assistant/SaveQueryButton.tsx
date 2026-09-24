"use client";

import { Bookmark, BookmarkCheck, BookmarkX } from "lucide-react";
import { useState } from "react";

import { saveQuery } from "@/lib/api/endpoints";
import { cn } from "@/lib/cn";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const LABELS: Record<SaveStatus, string> = {
  idle: "Save query",
  saving: "Saving query…",
  saved: "Query saved",
  error: "Save failed — retry",
};

interface SaveQueryButtonProps {
  text: string;
  className?: string;
}

/** Bookmark beside the original query bubble — `POST /queries/saved`, which is
 *  what the Saved Queries screen lists. Disabled once saved so a double click
 *  cannot create duplicate rows. */
export function SaveQueryButton({ text, className }: SaveQueryButtonProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const save = async () => {
    setStatus("saving");
    try {
      await saveQuery(text);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const Icon = status === "saved" ? BookmarkCheck : status === "error" ? BookmarkX : Bookmark;
  const label = LABELS[status];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={status === "saving" || status === "saved"}
      onClick={() => void save()}
      className={cn(
        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 disabled:cursor-default",
        status === "saved" && "text-accent-strong",
        status === "error" && "text-flag",
        (status === "idle" || status === "saving") && "text-ink-3 hover:text-ink",
        status === "saving" && "animate-pulse",
        className,
      )}
    >
      <Icon
        size={15}
        strokeWidth={2}
        fill={status === "saved" ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
