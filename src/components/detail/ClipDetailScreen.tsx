"use client";

import { MessageSquare } from "lucide-react";
import { useEffect } from "react";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { ClipMetaPanel } from "@/components/detail/ClipMetaPanel";
import { RelatedClips } from "@/components/detail/RelatedClips";
import { VideoPlayer } from "@/components/detail/VideoPlayer";
import { clipSuggestedQuestions } from "@/data/suggestedQuestions";
import { getRelatedClips } from "@/lib/clips";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { Clip } from "@/types";

interface ClipDetailScreenProps {
  clip: Clip;
}

export function ClipDetailScreen({ clip }: ClipDetailScreenProps) {
  const query = useAppStore((state) => state.query);
  const seedClipChat = useAppStore((state) => state.seedClipChat);
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);

  const related = getRelatedClips(clip);

  // Open the thread with the investigator's query and the model's read of this clip.
  useEffect(() => {
    seedClipChat(clip.id, query);
  }, [clip.id, query, seedClipChat]);

  return (
    <div
      className={cn(
        "pt-[26px] pb-15 pl-8 transition-[padding] duration-200",
        chatOpen ? "pr-[412px]" : "pr-8",
      )}
    >
      <div className="flex min-w-0 flex-col gap-[18px]">
        <VideoPlayer clip={clip} />
        <ClipMetaPanel clip={clip} />
        <RelatedClips clips={related} />
      </div>

      {/* SPEC §6 — on Detail the panel opens from this floating pill. */}
      {chatOpen ? null : (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="border-hairline-strong bg-panel-solid shadow-glass-lg text-ink hover:text-accent fixed right-6 bottom-6 z-30 flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] transition-colors duration-150"
        >
          <MessageSquare size={17} strokeWidth={2} aria-hidden />
          Query Assistant
        </button>
      )}

      <QueryAssistant chatKey={clip.id} suggestedQuestions={clipSuggestedQuestions} />
    </div>
  );
}
