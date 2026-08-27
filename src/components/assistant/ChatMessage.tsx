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
          "max-w-[88%] rounded-md border px-3 py-2.5 text-[13px] leading-[1.4]",
          isUser
            ? "bg-user-bubble border-indigo/30 text-navy-deep"
            : "border-border text-ink-soft bg-white/70",
        )}
      >
        {message.text}
      </p>

      {message.relatedId ? (
        <Link
          href={`/clips/${message.relatedId}`}
          className="text-indigo-strong mt-[5px] font-sans text-xs no-underline hover:underline"
        >
          View related clip →
        </Link>
      ) : null}
    </div>
  );
}
