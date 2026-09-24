import type { CameraDirectoryEntry, Clip, RecentQuery, SavedQuery } from "@/types";

import { apiFetch } from "./client";
import { mockAskAssistant } from "./mocks/assistant";
import { mockGetTracks } from "./mocks/tracks";
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
  return {
    clips: result.results.map((item, index) => ragResultItemToClip(item, index)),
    summary: result.answer,
  };
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
 * PROPOSED `POST /api/v1/assistant/ask` — SIMULATED until the backend ships it
 * (contract: `AssistantAskRequest` / `AssistantAskResponse` in ./types.ts).
 * To switch to the real endpoint, replace the body with:
 *
 *   return apiFetch<AssistantAskResponse>("/api/v1/assistant/ask", {
 *     method: "POST",
 *     body: JSON.stringify(request),
 *   });
 */
export async function askAssistant(request: AssistantAskRequest): Promise<AssistantAskResponse> {
  return mockAskAssistant(request);
}

/**
 * PROPOSED `DELETE /api/v1/queries/saved/{id}` — NOT on the backend yet (the live
 * OpenAPI only has GET/POST on /queries/saved; see BACKEND_API_SPEC.md §5). Until it
 * ships the backend answers 405, which the Saved Queries screen reports as
 * "not available yet". Expected: 204 on success, 404 if already gone.
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
  /** Simulation only — the real endpoint reads objects from the database. */
  caption: string;
}

/**
 * PROPOSED `GET /api/v1/videos/{video_id}/tracks?start_seconds&end_seconds[&event_id]`
 * — SIMULATED until the backend ships it (contract: `TracksResponse` in ./types.ts;
 * spec: BACKEND_API_SPEC.md §3.3). To switch, replace the body with:
 *
 *   const params = new URLSearchParams({
 *     start_seconds: String(query.start_seconds),
 *     end_seconds: String(query.end_seconds),
 *     ...(query.event_id ? { event_id: query.event_id } : {}),
 *   });
 *   return apiFetch<TracksResponse>(
 *     `/api/v1/videos/${encodeURIComponent(query.video_id)}/tracks?${params}`,
 *   );
 */
export async function getTracks(query: TracksQuery): Promise<TracksResponse> {
  return mockGetTracks(query);
}
