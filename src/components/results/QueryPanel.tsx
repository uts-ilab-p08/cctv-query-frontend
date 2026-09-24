"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { ChatKey } from "@/types";

interface QueryPanelProps {
  query: string;
  /** `null` when no coincidence is selected — the assistant context is "Top 5 matches". */
  selectedClipId: string | null;
  contextLabel: string;
  onClearSelection: () => void;
  onJumpToClip: (id: string) => void;
}

/** Left column of Results: the running query, the assistant thread, and the composer
 *  with its CONTEXT chip. Reads and writes the shared chat store (`useAppStore`),
 *  keyed by `chatKey` — never local chat state. */
export function QueryPanel({
  query,
  selectedClipId,
  contextLabel,
  onClearSelection,
  onJumpToClip,
}: QueryPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatKey: ChatKey = selectedClipId ?? "results";
  const chat = useAppStore((state) => state.chats[String(chatKey)]) ?? [];
  const askInResults = useAppStore((state) => state.askInResults);
  const askAboutClip = useAppStore((state) => state.askAboutClip);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (selectedClipId != null) askAboutClip(selectedClipId, trimmed);
    else askInResults(trimmed);
    setDraft("");
  };

  return (
    <div className="border-hairline flex min-h-0 max-w-[520px] min-w-[260px] flex-1 basis-[380px] flex-col overflow-hidden border-r">
      <div className="border-hairline shrink-0 border-b px-4 py-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-ink-3 font-mono text-[10px] tracking-[1.2px]">YOUR QUERY</span>
        </div>
        <p title={query} className="text-ink truncate text-[13px] leading-[1.35]">
          {query}
        </p>
      </div>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {chat.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div
              key={`${message.role}-${index}`}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              {!isUser ? (
                <div className="mb-1.5 flex items-center gap-[7px]">
                  <span className="surface-action flex h-[18px] w-[18px] items-center justify-center rounded-md text-[10px]">
                    ✦
                  </span>
                  <span className="text-ink-3 font-mono text-[10px] tracking-[1px]">ASSISTANT</span>
                </div>
              ) : null}

              <div
                className={cn(
                  "max-w-[94%] rounded-[10px] border px-[13px] py-[11px] text-[13px] leading-[1.5]",
                  isUser
                    ? "surface-chat-user border-accent-line text-ink"
                    : "border-hairline bg-panel-solid text-ink-2",
                )}
                style={{ textWrap: "pretty" }}
              >
                {message.text}
              </div>

              {message.relatedId != null ? (
                <button
                  type="button"
                  onClick={() => onJumpToClip(message.relatedId as string)}
                  className="text-accent mt-[5px] text-[12px]"
                >
                  View related clip →
                </button>
              ) : null}
            </div>
          );
        })}

        {chat.length === 0 ? (
          <>
            <p className="text-ink-3 text-[12px]">Suggested questions</p>
            {resultsSuggestedQuestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="border-accent-line bg-panel-soft text-ink-2 rounded-lg border px-3 py-2.5 text-left text-[13px]"
              >
                {suggestion}
              </button>
            ))}
          </>
        ) : null}
      </div>

      <div className="shrink-0 px-3.5 pt-2.5 pb-3.5">
        <div
          onClick={() => inputRef.current?.focus()}
          className="border-hairline bg-panel shadow-glass flex cursor-text items-center gap-2.5 rounded-[22px] border py-2 pr-2 pl-4"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <div className="flex min-w-0 items-center gap-[7px]">
              <span className="text-ink-2 shrink-0 font-mono text-[11px] tracking-[0.6px]">
                CONTEXT
              </span>
              <span
                title={contextLabel}
                className="border-accent-line text-accent-strong min-w-0 truncate rounded-md border px-[7px] py-px font-mono text-[11px]"
                style={{ background: "var(--accent-soft)" }}
              >
                {contextLabel}
              </span>
              {selectedClipId != null ? (
                <button
                  type="button"
                  title="Use top 5 matches instead"
                  onClick={onClearSelection}
                  className="text-accent-strong shrink-0 px-1.5 py-[3px] text-[11px]"
                >
                  clear
                </button>
              ) : null}
            </div>

            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask(draft);
              }}
              placeholder="Ask a follow-up question…"
              className="text-ink w-full min-w-0 border-none bg-transparent p-0 text-[13px] leading-[1.4] outline-none"
            />
          </div>

          <button
            type="button"
            title="Send"
            onClick={() => ask(draft)}
            className="surface-action flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full"
          >
            <Send size={17} strokeWidth={2.1} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
