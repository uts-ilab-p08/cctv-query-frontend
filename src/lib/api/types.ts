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
