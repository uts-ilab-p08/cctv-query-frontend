import type { CameraDirectoryEntry, Clip, RecentQuery, SavedQuery } from "@/types";

import { apiFetch } from "./client";
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

/** Untyped response in the OpenAPI schema — see `listFrom`. */
export async function getRecentQueries(): Promise<RecentQuery[]> {
  const response = await apiFetch<unknown>("/api/v1/queries/recent");
  return listFrom<ApiRecentQuery>(response, "queries");
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

/**
 * `POST /api/v1/assistant/ask` — the RAG answers a question about the moments on
 * screen. Stateless: every call carries the whole context (query, scope, focus,
 * moments, history); see `AssistantAskRequest` in ./types.ts. `scope: "moment"`
 * needs a `focus_moment_id` that is among `moments`, or the backend answers 422.
 */
export async function askAssistant(request: AssistantAskRequest): Promise<AssistantAskResponse> {
  return apiFetch<AssistantAskResponse>("/api/v1/assistant/ask", {
    method: "POST",
    body: JSON.stringify(request),
  });
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
