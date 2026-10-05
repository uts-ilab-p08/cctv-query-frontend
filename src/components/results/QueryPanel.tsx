"use client";

import { Pencil, Play, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { RetryButton } from "@/components/assistant/RetryButton";
import { SaveQueryButton } from "@/components/assistant/SaveQueryButton";
import { ChatMarkdown, type CitedSource } from "@/components/assistant/ChatMarkdown";
import { StreamedText } from "@/components/assistant/StreamedText";
import {
  glowProps,
  groupedItemClass,
  SuggestionLabel,
  SuggestionsSkeleton,
} from "@/components/assistant/SuggestedQuestions";
import { ThinkingDots } from "@/components/assistant/ThinkingDots";
import { MomentCardContent } from "@/components/results/MomentCard";
import { NewQueryModal } from "@/components/results/NewQueryModal";
import { cn } from "@/lib/cn";
import { useLatchedSuggestions } from "@/lib/useLatchedSuggestions";
import { useSequentialGlow } from "@/lib/useSequentialGlow";
import { useStickToBottom } from "@/lib/useStickToBottom";
import {
  markTransitionTarget,
  QUERY_BOX_TRANSITION,
  withViewTransition,
} from "@/lib/viewTransition";
import { startersKey, useAppStore } from "@/store/useAppStore";
import type { ChatMessage, Clip } from "@/types";

/** Stable reference so an empty thread does not re-trigger the store selector. */
const EMPTY_THREAD: ChatMessage[] = [];
const NO_QUESTIONS: string[] = [];

/** How a cited moment is named: what happened, where, and when in its video. */
const sourceLabel = (clip: Clip) =>
  `${clip.eventName ?? clip.action} · ${clip.camera} · ${clip.ts}`;

interface QueryPanelProps {
  query: string;
  /** `null` when no moment is selected. A selection only narrows the next question — the
   *  conversation stays one `results` thread either way. */
  selectedClipId: string | null;
  contextLabel: string;
  onClearSelection: () => void;
  onJumpToClip: (id: string) => void;
  /** Play a moment from a second of its video: a camera time the answer named. */
  onPlayAt: (id: string, sec: number) => void;
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
  onPlayAt,
  hidden = false,
}: QueryPanelProps) {
  const [draft, setDraft] = useState("");
  /** The New Query dialog: empty for a new search, or starting from this one to edit it. */
  const [queryDialog, setQueryDialogState] = useState<"new" | "edit" | null>(null);
  const newQueryOpen = queryDialog !== null;
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // YOUR QUERY is where Home's field lands: the navigation's transition can run now.
  useLayoutEffect(markTransitionTarget, []);

  /** The dialog opens and closes as a view transition: YOUR QUERY grows into its field
   *  and back. `flushSync`, so the browser captures the new state right away. */
  const setQueryDialog = (dialog: "new" | "edit" | null) =>
    withViewTransition(() => flushSync(() => setQueryDialogState(dialog)));

  const chat = useAppStore((state) => state.chats.results) ?? EMPTY_THREAD;
  const askInResults = useAppStore((state) => state.askInResults);
  const retryLast = useAppStore((state) => state.retryLast);
  const results = useAppStore((state) => state.results);

  const storeQuery = useAppStore((state) => state.query);
  const searchPending = useAppStore((state) => state.searchPending);
  const loadStarters = useAppStore((state) => state.loadStarters);
  const contextKey = startersKey("results", selectedClipId, storeQuery);
  const starters = useAppStore((state) => state.starters[contextKey]) ?? NO_QUESTIONS;
  const startersLoading = useAppStore((state) => contextKey in state.startersPending);
  // A context whose questions weren't requested yet (they are, in an effect, right after
  // this render) is loading too — not "loaded with none", which would clear the old ones.
  const startersRequested = useAppStore((state) => contextKey in state.starters);

  // The opening questions for this context come from the RAG (/assistant/suggestions);
  // fetched once per search + selected moment, after the search has answered.
  useEffect(() => {
    void loadStarters("results", selectedClipId);
  }, [loadStarters, selectedClipId, storeQuery, searchPending]);

  // Suggestions follow the current context. The latest answer's follow-ups apply only
  // if it was about the same context; otherwise that context's opening questions.
  const last = chat.at(-1);
  const asked = new Set(chat.filter((m) => m.role === "user").map((m) => m.text));
  const answerFollowUps =
    last?.role === "agent" && !last.status && (last.focus ?? null) === selectedClipId
      ? last.suggestions
      : undefined;
  const suggestions =
    last?.status === "pending"
      ? NO_QUESTIONS
      : answerFollowUps?.length
        ? answerFollowUps
        : starters.filter((question) => !asked.has(question));

  // Drawn questions stay until the next ones arrive (a new context, or an answer's
  // follow-ups); only the very first load shows a placeholder.
  const refreshing = startersLoading || !startersRequested || last?.status === "pending";
  const latched = useLatchedSuggestions(suggestions, refreshing);
  // While stale, drop what was just asked: it already shows as the question bubble.
  const shown = latched.stale
    ? { ...latched, questions: latched.questions.filter((question) => !asked.has(question)) }
    : latched;

  // One suggested question at a time gets a light running around its border — not on
  // the stale ones waiting to be replaced.
  const glowing = useSequentialGlow(shown.stale ? 0 : shown.questions.length);

  // Each new message or answer brings the thread to the bottom; it then follows the
  // answer as it streams in, unless the investigator scrolled up to read.
  useStickToBottom(listRef, `${chat.length}:${last?.status ?? ""}`);

  // The search's answer cites moments as [n] (`Clip.ref`): each becomes a chip.
  const sourceFor = useCallback(
    (ref: number): CitedSource | undefined => {
      const clip = results.find((candidate) => candidate.ref === ref);
      return clip ? { id: clip.id, label: sourceLabel(clip) } : undefined;
    },
    [results],
  );
  // Camera times it names (16:51:12) become links that play their moment from there.
  const formatAnswer = useCallback(
    (text: string) => (
      <ChatMarkdown
        text={text}
        source={sourceFor}
        onOpenSource={onJumpToClip}
        moments={results}
        onOpenTime={onPlayAt}
      />
    ),
    [sourceFor, onJumpToClip, results, onPlayAt],
  );

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
          // The open dialog's field carries the name meanwhile: one element at a time.
          style={newQueryOpen ? undefined : { viewTransitionName: QUERY_BOX_TRANSITION }}
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
            onClick={() => setQueryDialog("edit")}
            aria-label="Edit query"
            title="Edit query"
            className="glass-card-flat text-ink-2 hover:text-ink flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full"
          >
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setQueryDialog("new")}
            className="surface-action shadow-action flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-3.5 pl-2.5 font-sans text-[12px]"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            New Query
          </button>
        </div>
      </div>

      {queryDialog ? (
        <NewQueryModal
          onClose={() => setQueryDialog(null)}
          initialQuery={queryDialog === "edit" ? query : undefined}
        />
      ) : null}

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
                  data-bubble="user"
                  className="surface-chat-user border-accent-line flex w-full max-w-[320px] flex-col gap-2 rounded-[10px] rounded-br-none border p-1.5"
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
                  {/* The question is a bubble with its square corner toward the thread; the
                      answer sits on the chat's own background, so the two read apart. */}
                  <div
                    data-bubble={isUser ? "user" : "agent"}
                    className={cn(
                      "min-w-0 text-[13px] leading-[1.5]",
                      isUser
                        ? "surface-chat-user border-accent-line text-ink rounded-[10px] rounded-br-none border px-[13px] py-[11px]"
                        : "text-ink-2 py-0.5",
                      message.status === "error" && "text-flag",
                    )}
                    style={{ textWrap: "pretty" }}
                  >
                    {message.status === "pending" ? (
                      <ThinkingDots label={message.progress} />
                    ) : isUser || message.status ? (
                      message.text
                    ) : (
                      <StreamedText text={message.text} streamKey={message} format={formatAnswer} />
                    )}
                  </div>
                </div>
              )}

              {/* Only the latest answer can be retried: an older one would reorder the thread. */}
              {message.status === "error" && index === chat.length - 1 ? (
                <RetryButton onRetry={() => void retryLast("results")} className="mt-1.5" />
              ) : null}

              {message.citations?.length ? (
                // One row of pills, scrolled sideways, so many sources never push the
                // thread down.
                <div
                  role="group"
                  aria-label="Sources"
                  className="mt-1.5 flex w-full max-w-[94%] min-w-0 flex-col gap-1"
                >
                  <span aria-hidden className="text-ink-3 font-mono text-[10px] tracking-[1px]">
                    SOURCES
                  </span>
                  <ul className="flex snap-x scrollbar-thin list-none flex-nowrap gap-1.5 overflow-x-auto p-0 pb-1">
                    {message.citations.map((id) => {
                      const clip = results.find((candidate) => candidate.id === id);
                      if (!clip) return null;
                      const name = clip.eventName ?? clip.action;
                      return (
                        <li key={id} className="shrink-0 snap-start">
                          <button
                            type="button"
                            onClick={() => onJumpToClip(id)}
                            aria-label={
                              clip.ref
                                ? `Jump to source ${clip.ref}: ${sourceLabel(clip)}`
                                : `Jump to ${clip.ts} · ${name}`
                            }
                            title={name}
                            className="border-hairline text-ink-3 hover:border-hairline-strong hover:text-ink-2 flex max-w-[220px] cursor-pointer items-center gap-1 rounded-full border bg-transparent px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors duration-150"
                          >
                            {clip.ref ? (
                              // Same number as the chip in the answer's text.
                              <span className="bg-ink-3/15 flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[9px] leading-none">
                                {clip.ref}
                              </span>
                            ) : (
                              <Play
                                size={10}
                                strokeWidth={2.4}
                                fill="currentColor"
                                aria-hidden
                                className="shrink-0"
                              />
                            )}
                            <span className="shrink-0 font-mono">{clip.ts}</span>
                            <span className="truncate">· {name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}

        {shown.firstLoad ? (
          <SuggestionsSkeleton
            corners="lg"
            rowClassName="border-accent-line bg-accent-soft border"
            className="mt-auto"
          />
        ) : shown.questions.length ? (
          // `mt-auto`: pinned down by the input while the thread is short; once it
          // overflows the margin collapses and the block scrolls with the thread.
          <div className="mt-auto flex flex-col gap-2">
            <p className="text-ink-3 text-[12px]">Suggested questions</p>
            <div
              role="group"
              aria-label="Suggested questions"
              aria-busy={shown.stale || undefined}
              className="flex flex-col"
            >
              {shown.questions.map((suggestion, index) => {
                const glow = glowProps(index === glowing);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    // The previous questions, kept on screen while the next ones load.
                    disabled={shown.stale}
                    style={glow.style}
                    className={cn(
                      "group border-accent-line bg-accent-soft text-ink-2 hover:bg-accent-line/45 hover:text-ink hover:border-accent disabled:hover:bg-accent-soft disabled:hover:text-ink-2 disabled:hover:border-accent-line flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-left text-[13px] transition-[color,background-color,border-color,opacity] duration-150 disabled:cursor-default disabled:opacity-55",
                      groupedItemClass(index, shown.questions.length, "lg"),
                      glow.className,
                    )}
                  >
                    <SuggestionLabel text={suggestion} />
                  </button>
                );
              })}
            </div>
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
