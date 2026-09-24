import { clipSuggestedQuestions, resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { fmtElapsed } from "@/lib/time";

import type { AssistantAskRequest, AssistantAskResponse, AssistantMoment } from "../types";

/**
 * SIMULATION of the proposed `POST /api/v1/assistant/ask` (contract in ../types.ts).
 * It answers only from what the request carries — the same information the real
 * endpoint would get — so a demo shows what the backend must do, not what the
 * frontend can fake. Rules are keyword-based on purpose: the real endpoint should
 * reason with the RAG/LLM instead.
 */

const VEHICLE = /\b(car|van|vehicle|truck|suv|sedan|bus)\b/i;
/** "Near" in the moment scope: within this many seconds of the focused moment. */
const NEAR_SECONDS = 60;
const MAX_FOLLOW_UPS = 3;

const pct = (m: AssistantMoment) => `${Math.round(m.score * 100)}%`;
const where = (m: AssistantMoment) =>
  `${m.camera ?? `video ${m.video_id}`} at ${fmtElapsed(m.start_seconds)}`;
const cite = (list: AssistantMoment[]) => list.map((m) => ({ moment_id: m.moment_id }));

function followUps(request: AssistantAskRequest): string[] {
  const pool = request.scope === "moment" ? clipSuggestedQuestions : resultsSuggestedQuestions;
  const asked = new Set([request.question, ...request.history.map((turn) => turn.text)]);
  return pool.filter((question) => !asked.has(question)).slice(0, MAX_FOLLOW_UPS);
}

type Answer = Pick<AssistantAskResponse, "answer" | "citations">;

function answerAboutResults(q: string, moments: AssistantMoment[]): Answer | null {
  if (q.includes("camera")) {
    const groups = new Map<string, AssistantMoment[]>();
    for (const m of moments) {
      const key = m.camera ?? `video ${m.video_id}`;
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    const [label, group] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    return {
      answer: `${label} has the most matches with ${group.length} of ${moments.length} moments.`,
      citations: cite(group),
    };
  }

  if (q.includes("confidence") || q.includes("highest")) {
    const top = [...moments].sort((a, b) => b.score - a.score)[0];
    return {
      answer: `Highest-confidence match: "${top.caption}" on ${where(top)} (${pct(top)}).`,
      citations: cite([top]),
    };
  }

  if (q.includes("vehicle")) {
    const vehicles = moments.filter((m) => VEHICLE.test(m.caption));
    return vehicles.length
      ? {
          answer: `Narrowed to ${vehicles.length} vehicle moment(s) out of ${moments.length}.`,
          citations: cite(vehicles),
        }
      : {
          answer: `None of the ${moments.length} matched moments mention a vehicle.`,
          citations: [],
        };
  }

  if (q.includes("recent") || q.includes("latest")) {
    // The RAG returns no wall-clock time, so "recent" can only mean "latest in its video".
    const latest = [...moments].sort((a, b) => b.start_seconds - a.start_seconds)[0];
    return {
      answer: `Most recent match: "${latest.caption}" on ${where(latest)}.`,
      citations: cite([latest]),
    };
  }

  return null;
}

function answerAboutMoment(
  q: string,
  focus: AssistantMoment,
  moments: AssistantMoment[],
): Answer | null {
  const others = moments.filter((m) => m.moment_id !== focus.moment_id);
  const sameVideo = others.filter((m) => m.video_id === focus.video_id);

  if (q.includes("before") || q.includes("leave")) {
    const earlier = sameVideo
      .filter((m) => m.start_seconds < focus.start_seconds)
      .sort((a, b) => b.start_seconds - a.start_seconds)[0];
    return earlier
      ? {
          answer: `Yes — "${earlier.caption}" on ${where(earlier)}, before this moment.`,
          citations: cite([earlier]),
        }
      : { answer: "No earlier matched moment in this video.", citations: [] };
  }

  if (q.includes("path") || q.includes("vehicle")) {
    const vehicles = others.filter((m) => VEHICLE.test(m.caption));
    return vehicles.length
      ? {
          answer: `Found ${vehicles.length} other vehicle moment(s) among the matches. Tracking the same vehicle across cameras needs re-identification from the backend.`,
          citations: cite(vehicles),
        }
      : { answer: "No other vehicle moments among the matches.", citations: [] };
  }

  if (q.includes("near") || q.includes("else")) {
    const near = sameVideo.filter(
      (m) => Math.abs(m.start_seconds - focus.start_seconds) <= NEAR_SECONDS,
    );
    return near.length
      ? {
          answer: `${near.length} other moment(s) within ${NEAR_SECONDS}s of this one: ${near.map((m) => `"${m.caption}"`).join(", ")}.`,
          citations: cite(near),
        }
      : { answer: `Nothing else matched within ${NEAR_SECONDS}s of this moment.`, citations: [] };
  }

  if (q.includes("next") || q.includes("flag")) {
    const later = sameVideo
      .filter((m) => m.start_seconds > focus.start_seconds)
      .sort((a, b) => a.start_seconds - b.start_seconds);
    const next = later.find((m) => m.score < 0.7) ?? later[0];
    return next
      ? {
          answer: `Next: "${next.caption}" on ${where(next)} (${pct(next)}).`,
          citations: cite([next]),
        }
      : { answer: "No later matched moment in this video.", citations: [] };
  }

  return null;
}

/** Pure core of the simulation — exported for tests. */
export function answerQuestion(request: AssistantAskRequest): AssistantAskResponse {
  const { moments } = request;
  const q = request.question.toLowerCase();
  const suggested_questions = followUps(request);

  if (moments.length === 0) {
    return {
      answer: "There are no matched moments to answer from.",
      citations: [],
      suggested_questions,
    };
  }

  const focus =
    request.scope === "moment"
      ? moments.find((m) => m.moment_id === request.focus_moment_id)
      : undefined;
  const specific = focus ? answerAboutMoment(q, focus, moments) : answerAboutResults(q, moments);
  if (specific) return { ...specific, suggested_questions };

  const closest = [...moments].sort((a, b) => b.score - a.score)[0];
  return {
    answer: `I looked through ${moments.length} matched moments for "${request.question}". The closest is "${closest.caption}" on ${where(closest)}.`,
    citations: cite([closest]),
    suggested_questions,
  };
}

/** Network-shaped wrapper: resolves after a delay, like the real endpoint would. */
export async function mockAskAssistant(
  request: AssistantAskRequest,
  { delayMs = 900 }: { delayMs?: number } = {},
): Promise<AssistantAskResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return answerQuestion(request);
}
