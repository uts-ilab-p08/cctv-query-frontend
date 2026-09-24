"use client";

import { Play, Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SaveQueryButton } from "@/components/assistant/SaveQueryButton";
import { ThinkingDots } from "@/components/assistant/ThinkingDots";
import { MomentCardContent } from "@/components/results/MomentCard";
import { NewQueryModal } from "@/components/results/NewQueryModal";
import { clipSuggestedQuestions, resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { ChatMessage } from "@/types";

/** Stable reference so an empty thread does not re-trigger the store selector. */
const EMPTY_THREAD: ChatMessage[] = [];

interface QueryPanelProps {
  query: string;
  /** `null` when no moment is selected. A selection only narrows the next question — the
   *  conversation stays one `results` thread either way. */
  selectedClipId: string | null;
  contextLabel: string;
  onClearSelection: () => void;
  onJumpToClip: (id: string) => void;
  /** Collapsed for the expanded-video view. Hidden rather than unmounted, so the
   *  draft, the scroll position and the New Query dialog state survive. */
  hidden?: boolean;
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
  hidden = false,
}: QueryPanelProps) {
  const [draft, setDraft] = useState("");
  const [newQueryOpen, setNewQueryOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = useAppStore((state) => state.chats.results) ?? EMPTY_THREAD;
  const askInResults = useAppStore((state) => state.askInResults);
  const results = useAppStore((state) => state.results);

  // Suggestions follow the current context. The latest answer's follow-ups apply only
  // if it was about the same context; otherwise offer that context's starters not yet asked.
  const last = chat.at(-1);
  const asked = new Set(chat.filter((m) => m.role === "user").map((m) => m.text));
  const suggestions =
    last?.status === "pending"
      ? []
      : last?.role === "agent" && !last.status && (last.focus ?? null) === selectedClipId
        ? (last.suggestions ?? [])
        : (selectedClipId != null ? clipSuggestedQuestions : resultsSuggestedQuestions).filter(
            (question) => !asked.has(question),
          );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, last?.status]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void askInResults(trimmed, selectedClipId);
    setDraft("");
  };

  return (
    <div
      hidden={hidden}
      className="border-hairline flex min-h-0 max-w-[520px] min-w-[260px] flex-1 basis-[380px] flex-col overflow-hidden border-r"
    >
      <div className="border-hairline shrink-0 border-b px-3.5 py-3">
        <div
          role="group"
          aria-label="Your query"
          className="border-accent-line bg-panel-solid shadow-glass flex items-center gap-2 rounded-[14px] border py-2 pr-2 pl-3.5"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-ink-3 font-mono text-[10px] tracking-[1.2px]">YOUR QUERY</span>
            <p title={query} className="text-ink truncate text-[14px] leading-[1.35] font-medium">
              {query}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNewQueryOpen(true)}
            className="surface-action shadow-action flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-3.5 pl-2.5 font-sans text-[12px]"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            New Query
          </button>
        </div>
      </div>

      <NewQueryModal open={newQueryOpen} onClose={() => setNewQueryOpen(false)} />

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {chat.map((message, index) => {
          const isUser = message.role === "user";
          // Only the search that opened the thread is saveable — follow-ups are
          // questions about the results, not queries worth re-running.
          const isOriginalQuery = isUser && index === 0 && message.text === query;
          // A question asked with a moment selected carries that moment's card.
          const focusClip =
            isUser && message.focus
              ? results.find((candidate) => candidate.id === message.focus)
              : undefined;
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

              {focusClip ? (
                <div
                  role="group"
                  aria-label="Question about a moment"
                  className="surface-chat-user border-accent-line flex w-full max-w-[320px] flex-col gap-2 rounded-[10px] border p-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onJumpToClip(focusClip.id)}
                    title="Jump to this moment"
                    className="glass-card-flat flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left"
                  >
                    <MomentCardContent clip={focusClip} />
                  </button>
                  <p
                    className="text-ink px-[7px] pb-1 text-[13px] leading-[1.5]"
                    style={{ textWrap: "pretty" }}
                  >
                    {message.text}
                  </p>
                </div>
              ) : (
                <div className="flex max-w-[94%] items-start gap-1">
                  {isOriginalQuery ? (
                    <SaveQueryButton text={message.text} className="mt-1.5" />
                  ) : null}
                  <div
                    className={cn(
                      "min-w-0 rounded-[10px] border px-[13px] py-[11px] text-[13px] leading-[1.5]",
                      isUser
                        ? "surface-chat-user border-accent-line text-ink"
                        : "border-hairline bg-panel-solid text-ink-2",
                      message.status === "error" && "text-flag",
                    )}
                    style={{ textWrap: "pretty" }}
                  >
                    {message.status === "pending" ? <ThinkingDots /> : message.text}
                  </div>
                </div>
              )}

              {message.citations?.length ? (
                <div className="mt-1.5 flex max-w-[94%] flex-wrap gap-1.5">
                  {message.citations.map((id) => {
                    const clip = results.find((candidate) => candidate.id === id);
                    if (!clip) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onJumpToClip(id)}
                        aria-label={`Jump to ${clip.ts} · ${clip.eventName ?? clip.action}`}
                        title={clip.eventName ?? clip.action}
                        className="border-accent-line text-accent-strong bg-accent-soft flex max-w-full cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
                      >
                        <Play size={10} strokeWidth={2.4} fill="currentColor" aria-hidden />
                        <span className="font-mono">{clip.ts}</span>
                        <span className="truncate">· {clip.eventName ?? clip.action}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {suggestions.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink-3 text-[12px]">Suggested questions</p>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="border-accent-line bg-accent-soft text-ink-2 hover:text-ink cursor-pointer rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors duration-150"
              >
                {suggestion}
              </button>
            ))}
          </div>
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
