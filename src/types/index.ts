/**
 * Domain types for the surveillance query workspace.
 *
 * These mirror the shape a real annotation backend (FastAPI) is expected to
 * return, so swapping `src/data` mocks for network calls does not ripple into
 * the component layer.
 */

export type ClipTag = "Person" | "Vehicle" | "Entry" | "Exit" | "Loitering" | "Object Left";

export interface Clip {
  /** bronze.events.event_id — stable, backend-assigned. */
  id: string;
  camera: string;
  code: string;
  perspective: string;
  /** Time of the event as shown: wall-clock `HH:MM:SS` for the mock data; for RAG
   *  results, the offset into the source video (`m:ss`) until wall-clock time exists. */
  ts: string;
  /** Human-readable event date, e.g. `Aug 4`. */
  date: string;
  /** Chronological position within the indexed window. */
  order: number;
  /** Model confidence, 0-100. */
  confidence: number;
  tags: ClipTag[];
  objects: string;
  action: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  /** Short event label from the RAG; when absent, `action` (the description) is shown. */
  eventName?: string;
  /** Source video id — several moments (clips) can share one video. */
  videoId?: string;
  /** Where the moment starts/ends inside `videoUrl`, in seconds. */
  startSeconds?: number;
  endSeconds?: number;
}

export interface Camera {
  code: string;
  perspective: string;
}

export interface CameraDirectoryEntry extends Camera {
  eventCount: number;
}

export type SearchMode = "nlq" | "classic";

/** Dark-mode accent palette; has no effect while the active theme is light. */
export type Palette =
  "violet" | "slate" | "amber" | "linen" | "lavender" | "magic" | "sea" | "blues";

export interface Filters {
  cameras: string[];
  tags: ClipTag[];
  /** Minimum confidence, 0-100. */
  confidence: number;
  dateFrom: string;
  dateTo: string;
}

export type KeywordKind = "tag" | "time" | "camera";

export interface KeywordDefinition {
  id: string;
  label: string;
  kind: KeywordKind;
  pattern: RegExp;
  /** Tag/time presets; `null` means the options come from the camera list. */
  options: string[] | null;
}

export interface DetectedKeyword {
  id: string;
  label: string;
  kind: KeywordKind;
  dropdownTitle: string;
  options: string[];
}

export interface SavedQuery {
  id: string;
  text: string;
  savedOn: string;
  hits: number;
}

export interface RecentQuery {
  id: string;
  text: string;
  ts: string;
  cameras: number;
}

export interface Report {
  id: string;
  title: string;
  range: string;
  cameras: number;
  generatedOn: string;
}

export interface StatCardData {
  label: string;
  value: string | number;
}

export type JobStatus = "pending" | "processing" | "done";

export type ExecutionTarget = "Local" | "Remote";

export type UploadScope = "full" | "clip";

export interface PipelineJob {
  id: number;
  filename: string;
  camera: string;
  duration: string;
  model: string;
  target: ExecutionTarget;
  status: JobStatus;
  /** Completion percentage, 0-100. */
  progress: number;
}

export type ChatRole = "user" | "agent";

export interface ChatMessage {
  role: ChatRole;
  text: string;
  /** Clip this answer points at, rendered as a "View related clip" action. */
  relatedId?: string;
  /** Clip ids the answer cites — rendered as "jump to" buttons on Results. */
  citations?: string[];
  /** Follow-up questions offered under this answer. */
  suggestions?: string[];
  /** Moment this turn was about, when asked with one selected (Results keeps one thread). */
  focus?: string;
  /** `pending` while the assistant is answering; `error` when it failed. */
  status?: "pending" | "error";
}

/** Chat threads are keyed by clip id, or by the literal `results` scope. */
export type ChatKey = string | "results";
