"use client";

import Link from "next/link";

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
        <p
          className={cn(
            "rounded-chip min-w-0 border px-3 py-2.5 text-[13px] leading-[1.4]",
            isUser
              ? "surface-chat-user border-accent-line text-ink"
              : "border-hairline bg-panel-solid text-ink-2",
            message.status === "error" && "text-flag",
          )}
        >
          {message.status === "pending" ? <ThinkingDots /> : message.text}
        </p>
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
