"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";
import type { ChatMessage as ChatMessageData } from "@/types";

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <p
        className={cn(
          "rounded-chip max-w-[88%] border px-3 py-2.5 text-[13px] leading-[1.4]",
          isUser
            ? "surface-chat-user border-accent-line text-ink"
            : "border-hairline bg-panel-solid text-ink-2",
        )}
      >
        {message.text}
      </p>

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
