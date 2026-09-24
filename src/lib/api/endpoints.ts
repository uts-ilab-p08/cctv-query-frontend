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
  ApiClip,
  ApiRecentQuery,
  ApiSavedQuery,
  RagQueryResult,
} from "./types";

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

/**
 * NOTE: the OpenAPI schema declares this endpoint's response as an untyped
 * `object` (FastAPI didn't attach a Pydantic response_model), so the exact
 * envelope shape is unconfirmed — this assumes `{ clips: [...] }` per the
 * original frontend spec. Verify against a real authenticated response
 * once Supabase auth is wired in, and adjust if the backend returns a bare
 * array or a different key instead.
 */
export async function getRelatedClips(id: string, limit = 4): Promise<Clip[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiFetch<{ clips?: ApiClip[] }>(
    `/api/v1/clips/${encodeURIComponent(id)}/related?${params.toString()}`,
  );
  return (response.clips ?? []).map(apiClipToClip);
}

/** NOTE: same untyped-response caveat as `getRelatedClips` — assumes `{ cameras: [...] }`. */
export async function getCameras(): Promise<CameraDirectoryEntry[]> {
  const response = await apiFetch<{ cameras?: ApiCameraDirectoryEntry[] }>("/api/v1/cameras");
  return (response.cameras ?? []).map(apiCameraToCameraDirectoryEntry);
}

/** NOTE: same untyped-response caveat as `getRelatedClips` — assumes `{ queries: [...] }`. */
export async function getRecentQueries(): Promise<RecentQuery[]> {
  const response = await apiFetch<{ queries?: ApiRecentQuery[] }>("/api/v1/queries/recent");
  return response.queries ?? [];
}

/**
 * NOTE: same untyped-response caveat as `getRelatedClips`. Accepts both
 * `{ queries: [...] }` and a bare array until the real envelope is confirmed.
 */
export async function getSavedQueries(): Promise<SavedQuery[]> {
  const response = await apiFetch<{ queries?: ApiSavedQuery[] } | ApiSavedQuery[]>(
    "/api/v1/queries/saved",
  );
  const rows = Array.isArray(response) ? response : (response.queries ?? []);
  return rows.map(apiSavedQueryToSavedQuery);
}

export async function saveQuery(text: string): Promise<SavedQuery> {
  const saved = await apiFetch<ApiSavedQuery>("/api/v1/queries/saved", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return apiSavedQueryToSavedQuery(saved);
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
