"use client";

import Link from "next/link";

import { renderChatMarkdown } from "@/components/assistant/ChatMarkdown";
import { StreamedText } from "@/components/assistant/StreamedText";
import { ThinkingDots } from "@/components/assistant/ThinkingDots";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { ChatMessage as ChatMessageData } from "@/types";

interface ChatMessageProps {
  message: ChatMessageData;
  /** Rendered beside the bubble, on the side facing the thread (e.g. a save bookmark). */
  action?: ReactNode;
}

export function ChatMessage({ message, action }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className="flex max-w-[88%] items-start gap-1">
        {action}
        {/* The question is a bubble with its square corner toward the thread; the answer
            sits on the panel's own background, so the two read apart. */}
        <div
          data-bubble={isUser ? "user" : "agent"}
          className={cn(
            "min-w-0 text-[13px] leading-[1.4]",
            isUser
              ? "surface-chat-user border-accent-line text-ink rounded-chip rounded-br-none border px-3 py-2.5"
              : "text-ink-2 py-0.5",
            message.status === "error" && "text-flag",
          )}
        >
          {message.status === "pending" ? (
            <ThinkingDots />
          ) : isUser || message.status ? (
            message.text
          ) : (
            <StreamedText text={message.text} streamKey={message} format={renderChatMarkdown} />
          )}
        </div>
      </div>

      {message.relatedId ? (
        <Link
          href={`/clips/${message.relatedId}`}
          className="text-accent mt-[5px] font-sans text-xs no-underline hover:underline"
        >
          View related clip →
        </Link>
      ) : null}
    </div>
  );
}
