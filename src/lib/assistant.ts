import { cameraNames } from "@/data/cameras";
import type { AssistantAnswer, Clip } from "@/types";

/**
 * Deterministic stand-in for the conversational backend. Answers are derived
 * from the indexed clip set so the UI can be exercised without a model.
 */

const cameraCount = cameraNames.length;

/** Opening summary shown when a search is run. */
export function summarizeResults(clips: Clip[], queryText: string): string {
  const top = [...clips].sort((a, b) => b.confidence - a.confidence)[0];
  if (!top) {
    return `No indexed events matched "${queryText}".`;
  }
  return `Found ${clips.length} indexed events matching "${queryText}" across ${cameraCount} cameras. Top match: ${top.action.toLowerCase()} on ${top.camera} at ${top.ts} (${top.confidence}% confidence).`;
}

/** Opening read of a single clip, shown when its assistant thread starts. */
export function summarizeClip(clip: Clip, queryText: string): string {
  const context = queryText.trim() ? `Matched against "${queryText.trim()}". ` : "";
  return `${context}This clip shows ${clip.action.toLowerCase()} on ${clip.camera} (${clip.perspective}) at ${clip.date} ${clip.ts}. Detected: ${clip.objects}. Model confidence ${clip.confidence}%.`;
}

/** Answer a follow-up asked while a specific clip is open. */
export function answerForClip(clips: Clip[], clip: Clip, question: string): AssistantAnswer {
  const previous = clips
    .filter((candidate) => candidate.order < clip.order)
    .sort((a, b) => b.order - a.order)[0];
  const next = clips
    .filter((candidate) => candidate.order > clip.order)
    .sort((a, b) => a.order - b.order)[0];
  const q = question.toLowerCase();

  if (q.includes("leave") || q.includes("before")) {
    return previous
      ? {
          text: `Yes — ${previous.action.toLowerCase()} on ${previous.camera} at ${previous.ts}, ${clip.order - previous.order} event(s) before this clip.`,
          relatedId: previous.id,
        }
      : { text: "No earlier events found in the indexed window before this clip." };
  }

  if (q.includes("path") || q.includes("vehicle")) {
    const vehicleClips = clips.filter(
      (candidate) => candidate.tags.includes("Vehicle") && candidate.id !== clip.id,
    );
    const first = vehicleClips[0];
    return first
      ? {
          text: `Tracked ${vehicleClips.length} vehicle event(s) across cameras, including "${first.action}" on ${first.camera} at ${first.ts}.`,
          relatedId: first.id,
        }
      : { text: "No other vehicle events found in this footage set." };
  }

  if (q.includes("else") || q.includes("nearby") || q.includes("near")) {
    return next
      ? {
          text: `${next.objects} detected on ${next.camera} at ${next.ts}, shortly after this event.`,
          relatedId: next.id,
        }
      : { text: "No other subjects detected in this time window." };
  }

  if (q.includes("flag") || q.includes("next")) {
    const flagged = clips.find(
      (candidate) => candidate.order > clip.order && candidate.confidence < 70,
    );
    return flagged
      ? {
          text: `Next lower-confidence event: "${flagged.action}" on ${flagged.camera} at ${flagged.ts} (${flagged.confidence}% confidence).`,
          relatedId: flagged.id,
        }
      : { text: "No further flagged events found on this camera." };
  }

  const fallback = next ?? previous;
  return fallback
    ? {
        text: `Searched indexed footage across ${cameraCount} cameras. Closest related match: "${fallback.action}" on ${fallback.camera} at ${fallback.ts}.`,
        relatedId: fallback.id,
      }
    : {
        text: `Searched indexed footage across ${cameraCount} cameras. No strongly related events found.`,
      };
}

/** Answer a follow-up asked from the results screen. */
export function answerForResults(clips: Clip[], question: string): AssistantAnswer {
  const q = question.toLowerCase();

  if (q.includes("camera")) {
    const counts = new Map<string, number>();
    clips.forEach((clip) => counts.set(clip.camera, (counts.get(clip.camera) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top
      ? { text: `${top[0]} has the most matches with ${top[1]} events.` }
      : { text: "No camera activity in the current result set." };
  }

  if (q.includes("confidence") || q.includes("high")) {
    const top = [...clips].sort((a, b) => b.confidence - a.confidence)[0];
    return top
      ? {
          text: `Highest-confidence match: "${top.action}" on ${top.camera} at ${top.ts} (${top.confidence}%).`,
          relatedId: top.id,
        }
      : { text: "No matches to rank by confidence." };
  }

  if (q.includes("vehicle")) {
    const vehicleClips = clips.filter((clip) => clip.tags.includes("Vehicle"));
    return {
      text: `Narrowed to ${vehicleClips.length} vehicle event(s). Try enabling the Vehicle event-type filter for a persistent view.`,
      relatedId: vehicleClips[0]?.id,
    };
  }

  if (q.includes("recent")) {
    const latest = [...clips].sort((a, b) => b.order - a.order)[0];
    return latest
      ? {
          text: `Most recent match: "${latest.action}" on ${latest.camera} at ${latest.ts}.`,
          relatedId: latest.id,
        }
      : { text: "No matches in the current result set." };
  }

  return {
    text: `Searched ${clips.length} indexed events across ${cameraCount} cameras for related context.`,
  };
}
