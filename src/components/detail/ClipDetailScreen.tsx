"use client";

import { useEffect } from "react";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { ClipMetaPanel } from "@/components/detail/ClipMetaPanel";
import { RelatedClips } from "@/components/detail/RelatedClips";
import { VideoPlayer } from "@/components/detail/VideoPlayer";
import { clipSuggestedQuestions } from "@/data/suggestedQuestions";
import { getRelatedClips } from "@/lib/clips";
import { useAppStore } from "@/lib/store";
import type { Clip } from "@/types";

interface ClipDetailScreenProps {
  clip: Clip;
}

export function ClipDetailScreen({ clip }: ClipDetailScreenProps) {
  const queryText = useAppStore((state) => state.queryText);
  const seedClipChat = useAppStore((state) => state.seedClipChat);

  const related = getRelatedClips(clip);

  // Open the thread with the investigator's query and the model's read of this clip.
  useEffect(() => {
    seedClipChat(clip.id, queryText);
  }, [clip.id, queryText, seedClipChat]);

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-[22px] px-8 pt-[26px] pb-15">
      <div className="flex min-w-0 flex-col gap-[18px]">
        <VideoPlayer clip={clip} />
        <ClipMetaPanel clip={clip} />
        <RelatedClips clips={related} />
      </div>

      <QueryAssistant
        chatKey={clip.id}
        suggestedQuestions={clipSuggestedQuestions}
        heightClassName="h-[calc(100vh-116px)]"
      />
    </div>
  );
}
