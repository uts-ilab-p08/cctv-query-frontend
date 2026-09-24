import { fmtElapsed } from "@/lib/time";

import type {
  AssistantAskRequest,
  AssistantAskResponse,
  AssistantMoment,
  AssistantSuggestionsRequest,
  AssistantSuggestionsResponse,
} from "../types";

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

/** The questions this simulation knows how to answer — a real RAG would write its own. */
export const RESULTS_QUESTIONS = {
  camera: "Which camera has the most matches?",
  highest: "Show only the highest-confidence event",
  vehicles: "Narrow this to vehicle events only",
  recent: "What's the most recent match?",
} as const;

export const MOMENT_QUESTIONS = {
  before: "Did anyone leave the building before this?",
  path: "Show this vehicle's full path across cameras",
  near: "Who else was near this location around this time?",
  next: "Jump to the next flagged event on this camera",
} as const;

/** Candidates that make sense for this context, most useful first. */
function candidates(request: AssistantSuggestionsRequest): string[] {
  const { moments } = request;
  if (moments.length === 0) return [];

  if (request.scope === "moment") {
    const focus = moments.find((m) => m.moment_id === request.focus_moment_id);
    if (!focus) return [];
    const moment: (string | null)[] = [
      VEHICLE.test(focus.caption) ? MOMENT_QUESTIONS.path : null,
      MOMENT_QUESTIONS.near,
      MOMENT_QUESTIONS.before,
      MOMENT_QUESTIONS.next,
    ];
    return moment.filter((q): q is string => q !== null);
  }

  const sources = new Set(moments.map((m) => m.camera ?? m.video_id));
  const vehicles = moments.filter((m) => VEHICLE.test(m.caption)).length;
  const results: (string | null)[] = [
    sources.size > 1 ? RESULTS_QUESTIONS.camera : null,
    moments.length > 1 ? RESULTS_QUESTIONS.highest : null,
    vehicles > 0 && vehicles < moments.length ? RESULTS_QUESTIONS.vehicles : null,
    moments.length > 1 ? RESULTS_QUESTIONS.recent : null,
  ];
  return results.filter((q): q is string => q !== null);
}

/** Pure core of the simulated `/assistant/suggestions` — exported for tests. */
export function suggestQuestionsFor(
  request: AssistantSuggestionsRequest,
): AssistantSuggestionsResponse {
  const asked = new Set(request.history.filter((t) => t.role === "user").map((t) => t.text));
  return {
    suggested_questions: candidates(request)
      .filter((question) => !asked.has(question))
      .slice(0, MAX_FOLLOW_UPS),
  };
}

function followUps(request: AssistantAskRequest): string[] {
  return suggestQuestionsFor({
    ...request,
    history: [...request.history, { role: "user", text: request.question }],
  }).suggested_questions;
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

/** Network-shaped wrapper for the simulated `/assistant/suggestions`. */
export async function mockSuggestQuestions(
  request: AssistantSuggestionsRequest,
  { delayMs = 400 }: { delayMs?: number } = {},
): Promise<AssistantSuggestionsResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return suggestQuestionsFor(request);
}
