import { cameraNames } from "@/data/cameras";
import type { Clip } from "@/types";

/**
 * Opening summaries for the mock data path. Follow-up questions go through
 * `askAssistant` (the simulated `/assistant/ask`, see src/lib/api/mocks).
 */

const cameraCount = cameraNames.length;

/** Opening summary shown when a search is run. */
export function summarizeResults(clips: Clip[], query: string): string {
  const top = [...clips].sort((a, b) => b.confidence - a.confidence)[0];
  if (!top) {
    return `No indexed events matched "${query}".`;
  }
  return `Found ${clips.length} indexed events matching "${query}" across ${cameraCount} cameras. Top match: ${top.action.toLowerCase()} on ${top.camera} at ${top.ts} (${top.confidence}% confidence).`;
}

/** Opening read of a single clip, shown when its assistant thread starts. */
export function summarizeClip(clip: Clip, query: string): string {
  const context = query.trim() ? `Matched against "${query.trim()}". ` : "";
  return `${context}This clip shows ${clip.action.toLowerCase()} on ${clip.camera} (${clip.perspective}) at ${clip.date} ${clip.ts}. Detected: ${clip.objects}. Model confidence ${clip.confidence}%.`;
}
