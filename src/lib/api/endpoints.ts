import { parseIsoTime } from "@/lib/time";
import type { CameraDirectoryEntry, Clip, RecentQuery, SavedQuery } from "@/types";

import { ApiError, apiFetch, apiStream } from "./client";
import { SseParser } from "./sse";
import {
  apiCameraToCameraDirectoryEntry,
  apiClipToClip,
  apiSavedQueryToSavedQuery,
  ragResultItemToClip,
} from "./normalize";
import type {
  ApiCameraDirectoryEntry,
  AssistantAskRequest,
  AssistantAskResponse,
  AssistantSuggestionsRequest,
  AssistantSuggestionsResponse,
  ApiClip,
  ApiRecentQuery,
  ApiSavedQuery,
  RagQueryResult,
  TracksResponse,
} from "./types";

/**
 * Rows of a list endpoint whose response is an untyped `object` in the OpenAPI
 * schema (no Pydantic response_model), so the envelope is unconfirmed. Accepts
 * the documented `{ [key]: [...] }` and a bare array; anything else is empty.
 */
function listFrom<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) return response as T[];
  const rows = (response as Record<string, unknown> | null)?.[key];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export interface SearchResult {
  clips: Clip[];
  summary: string;
}

/** `GET /api/v1/search` — thin pass-through to the RAG service (see normalize.ts). */
export async function searchClips(query: string, limit = 10): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const result = await apiFetch<RagQueryResult>(`/api/v1/search?${params.toString()}`);
  // Two results can fall in the same event; suffix the start so ids stay unique.
  const seen = new Set<string>();
  const clips = result.results.map((item, index) => {
    const clip = ragResultItemToClip(item, index);
    const id = seen.has(clip.id) ? `${clip.id}:${item.start_seconds}` : clip.id;
    seen.add(id);
    return id === clip.id ? clip : { ...clip, id };
  });
  return { clips, summary: result.answer };
}

/**
 * `authToken` lets the one Server Component caller (`/clips/[clipId]/page.tsx`)
 * pass in a token it resolved via `@/lib/supabase/server` — see the docstring
 * in `./client.ts` for why that resolution can't happen inside this shared,
 * client-importable module.
 */
export async function getClipById(id: string, authToken?: string | null): Promise<Clip> {
  const clip = await apiFetch<ApiClip>(`/api/v1/clips/${encodeURIComponent(id)}`, { authToken });
  return apiClipToClip(clip);
}

/** Untyped response in the OpenAPI schema — see `listFrom`. */
export async function getRelatedClips(id: string, limit = 4): Promise<Clip[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiFetch<unknown>(
    `/api/v1/clips/${encodeURIComponent(id)}/related?${params.toString()}`,
  );
  return listFrom<ApiClip>(response, "clips").map(apiClipToClip);
}

/** Untyped response in the OpenAPI schema — see `listFrom`. */
export async function getCameras(): Promise<CameraDirectoryEntry[]> {
  const response = await apiFetch<unknown>("/api/v1/cameras");
  return listFrom<ApiCameraDirectoryEntry>(response, "cameras").map(
    apiCameraToCameraDirectoryEntry,
  );
}

/**
 * The newest `limit` recent queries, via `?limit=`. Rows are still sorted newest
 * first — when every `ts` is ISO — and cut here, so the list stays right even
 * against a backend deployment that doesn't honour `limit` yet.
 */
export async function getRecentQueries(limit = 3): Promise<RecentQuery[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiFetch<unknown>(`/api/v1/queries/recent?${params}`);
  const rows = listFrom<ApiRecentQuery>(response, "queries");
  const times = rows.map((row) => parseIsoTime(row.ts));
  const sorted = times.every((t) => t !== null)
    ? rows
        .map((row, index) => ({ row, t: times[index] as number }))
        .sort((a, b) => b.t - a.t)
        .map(({ row }) => row)
    : rows;
  return sorted.slice(0, limit);
}

/** Untyped response in the OpenAPI schema — see `listFrom`. */
export async function getSavedQueries(): Promise<SavedQuery[]> {
  const response = await apiFetch<unknown>("/api/v1/queries/saved");
  return listFrom<ApiSavedQuery>(response, "queries").map(apiSavedQueryToSavedQuery);
}

export async function saveQuery(text: string): Promise<SavedQuery> {
  const saved = await apiFetch<ApiSavedQuery>("/api/v1/queries/saved", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return apiSavedQueryToSavedQuery(saved);
}

export interface AskOptions {
  /** Each step the backend reports while preparing the answer, e.g. "Generating answer…". */
  onStatus?: (message: string) => void;
}

/**
 * The RAG answers a question about the moments on screen. Stateless: every call carries
 * the whole context (query, scope, focus, moments, history); see `AssistantAskRequest`.
 * `scope: "moment"` needs a `focus_moment_id` that is among `moments`, or the backend
 * answers 422.
 *
 * Asks `POST /assistant/ask/stream` first, which reports progress as Server-Sent Events
 * (`status` steps, then one `result` or `error`) — coarse steps, not the answer's text.
 * A backend without that route (404/405) gets the plain `POST /assistant/ask` instead.
 */
export async function askAssistant(
  request: AssistantAskRequest,
  options: AskOptions = {},
): Promise<AssistantAskResponse> {
  const body = JSON.stringify(request);
  let response: Response;
  try {
    response = await apiStream("/api/v1/assistant/ask/stream", { method: "POST", body });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return apiFetch<AssistantAskResponse>("/api/v1/assistant/ask", { method: "POST", body });
    }
    throw error;
  }
  return readAskStream(response, options);
}

/** Reads `/assistant/ask/stream` to its terminal event: `result` or `error`. */
async function readAskStream(
  response: Response,
  { onStatus }: AskOptions,
): Promise<AssistantAskResponse> {
  if (!response.body) throw new Error("The assistant's stream had no body.");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const parser = new SseParser();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const { event, data } of parser.push(value)) {
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === "status" && typeof payload.message === "string") {
        onStatus?.(payload.message);
      } else if (event === "result") {
        void reader.cancel();
        return payload as unknown as AssistantAskResponse;
      } else if (event === "error") {
        void reader.cancel();
        throw new Error(
          typeof payload.message === "string" ? payload.message : "The assistant failed.",
        );
      }
    }
  }
  throw new Error("The assistant's stream ended without an answer.");
}

/**
 * `POST /api/v1/assistant/suggestions` — the opening questions for a thread context
 * (after a search, a selected moment, Clip Detail). Same context as `askAssistant`,
 * minus the question. The backend builds them from rules, not an LLM call.
 * Follow-ups after an answer come with `askAssistant`.
 */
export async function suggestQuestions(
  request: AssistantSuggestionsRequest,
): Promise<AssistantSuggestionsResponse> {
  return apiFetch<AssistantSuggestionsResponse>("/api/v1/assistant/suggestions", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * `DELETE /api/v1/queries/saved/{id}` — hard delete of the caller's own saved query.
 * 204 on success. 404 for an unknown id *or another user's* (never 403), so a retry
 * or a second click also gets 404: callers treat it as "already gone".
 */
export async function deleteSavedQuery(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/queries/saved/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface TracksQuery {
  video_id: string;
  start_seconds: number;
  end_seconds: number;
  /** Once /search returns it: limit the tracks to this event's objects. */
  event_id?: string | null;
}

/**
 * `GET /api/v1/videos/{video_id}/tracks` — bounding boxes for the moment's window,
 * read from bronze.geometries (no RAG). Boxes are top-left + size in source-frame
 * pixels, `t` in seconds into the same file as `video_url`. With `event_id`, only
 * that event's objects; without it, every event of the video overlapping the window.
 */
export async function getTracks(query: TracksQuery): Promise<TracksResponse> {
  const params = new URLSearchParams({
    start_seconds: String(query.start_seconds),
    end_seconds: String(query.end_seconds),
    ...(query.event_id ? { event_id: query.event_id } : {}),
  });
  return apiFetch<TracksResponse>(
    `/api/v1/videos/${encodeURIComponent(query.video_id)}/tracks?${params}`,
  );
}
