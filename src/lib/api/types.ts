/**
 * Wire types for the Surveillance Video Query API, as documented at
 * https://surveillance-backend-nodd.onrender.com/docs (OpenAPI schema).
 * These mirror the backend's raw response shapes — `normalize.ts` converts
 * them into the app's own `Clip`/`RecentQuery`/etc. domain types.
 */

export interface RagResultItem {
  video_id: string;
  video_url: string | null;
  start_seconds: number;
  end_seconds: number;
  caption: string;
  score: number;
  /** Short event label. Not in the documented contract yet — optional until the RAG confirms it. */
  event_name?: string | null;
}

export interface RagQueryResult {
  answer: string;
  results: RagResultItem[];
}

export interface ApiClip {
  id: string;
  camera: string;
  code: string;
  perspective: string;
  ts: string;
  date: string;
  order: number;
  confidence: number;
  tags: string[];
  objects: string;
  action: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

export interface ApiCameraDirectoryEntry {
  code: string;
  perspective: string;
  eventCount: number;
}

export interface ApiRecentQuery {
  id: string;
  text: string;
  ts: string;
  cameras: number;
}

export interface ApiSavedQuery {
  id: string;
  text: string;
  savedOn: string;
  hits: number;
}

/*
 * ---------------------------------------------------------------------------
 * PROPOSED — `POST /api/v1/assistant/ask` (not implemented by the backend yet).
 * The frontend runs against a simulation of it (`./mocks/assistant.ts`); these
 * types are the contract the backend/RAG team is asked to implement.
 * ---------------------------------------------------------------------------
 */

/**
 * One matched moment, exactly as the frontend holds it. The request carries the
 * moments on screen so the endpoint can stay stateless (no stored search to look
 * up); the alternative is a `search_id` returned by `/search`, which keeps the
 * payload small but makes the backend persist every result set.
 */
export interface AssistantMoment {
  /** The frontend's id for the moment — the response cites moments by it. */
  moment_id: string;
  video_id: string;
  start_seconds: number;
  end_seconds: number | null;
  caption: string;
  /** 0–1, as `/search` returned it. */
  score: number;
  /** `null` while the RAG doesn't return cameras (see the /search gaps). */
  camera: string | null;
}

export interface AssistantAskRequest {
  /** The search that produced the moments. */
  query: string;
  question: string;
  /** "results": about all moments on screen. "moment": about `focus_moment_id`. */
  scope: "results" | "moment";
  focus_moment_id: string | null;
  moments: AssistantMoment[];
  /** Earlier turns of this thread, oldest first, for follow-up questions. */
  history: { role: "user" | "assistant"; text: string }[];
}

export interface AssistantAskResponse {
  answer: string;
  /** Moments the answer is about, by `moment_id` — rendered as "jump to" buttons. */
  citations: { moment_id: string }[];
  /** Follow-ups shown under the answer. */
  suggested_questions: string[];
}
