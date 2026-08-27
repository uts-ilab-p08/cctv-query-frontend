"use client";

import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "@/components/assistant/ChatMessage";
import { SuggestedQuestions } from "@/components/assistant/SuggestedQuestions";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/lib/store";
import type { ChatKey, ChatMessage as ChatMessageData } from "@/types";

/** Stable reference so an empty thread does not re-trigger the store selector. */
const EMPTY_THREAD: ChatMessageData[] = [];

interface QueryAssistantProps {
  /** Thread scope: a clip id, or `results` for the search-wide thread. */
  chatKey: ChatKey;
  suggestedQuestions: string[];
  /** Tailwind height for the sticky panel, which differs per screen. */
  heightClassName: string;
}

export function QueryAssistant({
  chatKey,
  suggestedQuestions,
  heightClassName,
}: QueryAssistantProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useAppStore((state) => state.chats[String(chatKey)]) ?? EMPTY_THREAD;
  const askInResults = useAppStore((state) => state.askInResults);
  const askAboutClip = useAppStore((state) => state.askAboutClip);
  const resetChat = useAppStore((state) => state.resetChat);

  const ask = (question: string) => {
    if (!question.trim()) return;
    if (chatKey === "results") askInResults(question);
    else askAboutClip(chatKey, question);
    setDraft("");
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  return (
    <aside
      aria-label="Query Assistant"
      className={cn(
        "sticky top-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/68 shadow-[0_24px_60px_rgba(99,102,241,0.18),0_8px_20px_rgba(236,72,153,0.08)] backdrop-blur-[28px]",
        heightClassName,
      )}
    >
      <span aria-hidden className="bg-accent-bar absolute inset-x-0 top-0 h-[3px]" />

      <header className="border-border/70 flex items-center gap-2 border-b px-[18px] py-4">
        <span
          aria-hidden
          className="bg-mark-gradient flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-xs text-white"
        >
          ✦
        </span>
        <h2 className="text-sm font-semibold">Query Assistant</h2>
        <button
          type="button"
          onClick={() => resetChat(chatKey)}
          className="border-border text-ink-muted hover:text-ink ml-auto cursor-pointer rounded-[20px] border bg-white/70 px-3 py-[5px] font-sans text-[11px] transition-colors duration-150"
        >
          + New
        </button>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4">
        {messages.length === 0 ? (
          <SuggestedQuestions questions={suggestedQuestions} onAsk={ask} />
        ) : null}
        {messages.map((message, index) => (
          <ChatMessage key={`${message.role}-${index}`} message={message} />
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
        className="border-border/70 flex gap-2 border-t px-3.5 py-3"
      >
        <label htmlFor={`assistant-input-${chatKey}`} className="sr-only">
          Ask a follow-up question
        </label>
        <input
          id={`assistant-input-${chatKey}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a follow-up question…"
          className="border-border text-ink placeholder:text-ink-subtle focus:border-indigo-strong flex-1 rounded-sm border bg-white/70 px-3 py-2.5 font-sans text-[13px] transition-colors duration-150"
        />
        <button
          type="submit"
          aria-label="Send question"
          className="bg-mark-gradient h-9 w-9 shrink-0 cursor-pointer rounded-sm text-[15px] text-white shadow-[0_6px_16px_rgba(99,102,241,0.35)] transition-shadow duration-150 hover:shadow-[0_10px_22px_rgba(99,102,241,0.45)]"
        >
          →
        </button>
      </form>
    </aside>
  );
}
