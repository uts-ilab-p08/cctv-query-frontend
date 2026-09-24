"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { ChatMessage } from "@/components/assistant/ChatMessage";
import { SaveQueryButton } from "@/components/assistant/SaveQueryButton";
import { SuggestedQuestions } from "@/components/assistant/SuggestedQuestions";
import { startersKey, useAppStore } from "@/store/useAppStore";
import type { ChatKey, ChatMessage as ChatMessageData } from "@/types";

/** Stable reference so an empty thread does not re-trigger the store selector. */
const EMPTY_THREAD: ChatMessageData[] = [];
const NO_QUESTIONS: string[] = [];

interface QueryAssistantProps {
  /** Thread scope: a clip id, or `results` for the search-wide thread. */
  chatKey: ChatKey;
}

/**
 * SPEC §6 — a floating overlay, not a column: fixed at z-30 with only its left
 * corners rounded. Hidden until "Ask more →" (Results) or the assistant pill
 * (Detail) opens it, so it never occupies the document flow.
 */
export function QueryAssistant({ chatKey }: QueryAssistantProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const messages = useAppStore((state) => state.chats[String(chatKey)]) ?? EMPTY_THREAD;
  const askInResults = useAppStore((state) => state.askInResults);
  const askAboutClip = useAppStore((state) => state.askAboutClip);
  const resetChat = useAppStore((state) => state.resetChat);
  const query = useAppStore((state) => state.query);
  const key = String(chatKey);
  const focusId = chatKey === "results" ? null : key;
  const loadStarters = useAppStore((state) => state.loadStarters);
  const starters =
    useAppStore((state) => state.starters[startersKey(key, focusId, query)]) ?? NO_QUESTIONS;
  // A clip opened from the API is registered by its page after this child mounts;
  // retry once it is known.
  const focusKnown = useAppStore((state) => (focusId ? focusId in state.knownClips : true));

  const ask = (question: string) => {
    if (!question.trim()) return;
    if (chatKey === "results") void askInResults(question);
    else void askAboutClip(chatKey, question);
    setDraft("");
  };

  // Opening questions for this thread come from the RAG (simulated /assistant/suggestions).
  useEffect(() => {
    if (open) void loadStarters(key, focusId);
  }, [open, key, focusId, focusKnown, query, loadStarters]);

  // Follow-ups come from the latest answer; otherwise the thread's opening questions.
  const last = messages.at(-1);
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.text));
  const suggestions =
    last?.status === "pending"
      ? NO_QUESTIONS
      : last?.role === "agent" && !last.status && last.suggestions?.length
        ? last.suggestions
        : starters.filter((question) => !asked.has(question));

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, last?.status]);

  if (!open) return null;

  return (
    <aside
      aria-label="Query Assistant"
      className="rounded-l-card glass-panel fixed top-20 right-0 bottom-4 z-30 flex w-[380px] flex-col overflow-hidden border-y border-l"
    >
      <header className="border-hairline flex items-center gap-2 border-b px-[18px] py-4">
        <BrandMark size={20} className="text-brand shrink-0" />
        <h2 className="text-ink text-sm font-semibold">Query Assistant</h2>
        <button
          type="button"
          onClick={() => resetChat(chatKey)}
          className="glass-card-flat text-ink-2 hover:text-ink ml-auto cursor-pointer rounded-full px-3 py-[5px] font-sans text-[11px] transition-colors duration-150"
        >
          + New
        </button>
        <button
          type="button"
          onClick={() => setChatOpen(false)}
          aria-label="Collapse assistant"
          className="text-ink-2 hover:text-ink cursor-pointer rounded-lg p-1 transition-colors duration-150"
        >
          <ChevronRight size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4">
        {messages.map((message, index) => {
          // Only the search that seeded the thread is saveable, not follow-ups.
          const isOriginalQuery =
            message.role === "user" && index === 0 && message.text === query.trim();
          return (
            <ChatMessage
              key={`${message.role}-${index}`}
              message={message}
              action={
                isOriginalQuery ? (
                  <SaveQueryButton text={message.text} className="mt-1" />
                ) : undefined
              }
            />
          );
        })}
        {suggestions.length ? <SuggestedQuestions questions={suggestions} onAsk={ask} /> : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
        className="border-hairline flex items-center gap-2 border-t px-3.5 py-3"
      >
        <label htmlFor={`assistant-input-${chatKey}`} className="sr-only">
          Ask a follow-up question
        </label>
        <input
          id={`assistant-input-${chatKey}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a follow-up question…"
          className="glass-card-flat text-ink placeholder:text-ink-3 focus:border-accent-line flex-1 rounded-full px-3.5 py-2.5 font-sans text-[13px] transition-colors duration-150"
        />
        <button
          type="submit"
          aria-label="Send question"
          className="surface-action shadow-action flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full"
        >
          <ArrowRight size={17} strokeWidth={2} aria-hidden />
        </button>
      </form>
    </aside>
  );
}
