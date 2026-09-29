# Backend API Specification

What the frontend consumes today, what it still needs, and every place the RAG service is involved.

**Scope:** Home (`/dashboard`), Results (`/results`), Clip Detail (`/clips/[id]`), Saved Queries (`/saved`) and the Cameras directory.
**Out of scope for now:** the Video Annotation Pipeline. Reports was removed from the frontend.

- **Base URL:** `NEXT_PUBLIC_API_BASE_URL`. Dev is `https://surveillance-backend-nodd.onrender.com`; a local backend is `http://localhost:8000`. Live docs are at `/docs`.
- **Auth:** every endpoint except `/health` requires `Authorization: Bearer <Supabase access token>`. The live backend returns `403 {"detail":"Not authenticated"}` without a token and `401 {"detail":"Invalid or expired token"}` for a bad one. The frontend attaches the token in `src/lib/api/client.ts`: the browser session on the client, and a server-resolved token for the `/clips/[id]` server component.
- **Last checked against the live `/openapi.json`:** 2026-09-29.

---

## 1. Status at a glance

| Endpoint                               | Status                                               | Used by (frontend)                                                                     | Calls the RAG                         |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| `GET /health`                          | ✅ Live                                              | Not used. Monitoring only, no screen needs it.                                         | No                                    |
| `GET /api/v1/search`                   | ✅ Live · `thumbnail_url` and filters pending (§4.1) | Search from Home, New Query, Recent/Saved "run again", and a Results refresh via `?q=` | **Yes**: pass-through                 |
| `GET /api/v1/clips/{id}`               | ✅ Live                                              | Clip Detail page (server-rendered)                                                     | No                                    |
| `GET /api/v1/clips/{id}/related`       | ✅ Live                                              | Clip Detail, "Related clips"                                                           | No                                    |
| `GET /api/v1/cameras`                  | ✅ Live                                              | Cameras directory modal                                                                | No                                    |
| `GET /api/v1/queries/recent`           | ✅ Live                                              | Home, "Recent queries"                                                                 | Written as a side effect of `/search` |
| `GET /api/v1/queries/saved`            | ✅ Live                                              | Saved Queries screen                                                                   | No                                    |
| `POST /api/v1/queries/saved`           | ✅ Live · duplicate handling requested (§4.3)        | Bookmark on the original query in the chat                                             | No                                    |
| `DELETE /api/v1/queries/saved/{id}`    | ✅ Live (§3.1)                                       | Delete button, with a confirmation step, on Saved Queries                              | No                                    |
| `POST /api/v1/assistant/ask`           | ✅ Live (§3.2)                                       | Results chat and Clip Detail assistant                                                 | **Yes**                               |
| `POST /api/v1/assistant/suggestions`   | ✅ Live (§3.4)                                       | Opening suggested questions in the Results chat and Clip Detail assistant              | Rule-based today (see §3.4)           |
| `GET /api/v1/videos/{video_id}/tracks` | ✅ Live (§3.3)                                       | Box around the detected object on the Results player                                   | No (database)                         |

---

## 2. Live endpoints

### `GET /health`

No auth. Not called by the frontend. Keep it for uptime checks.

### `GET /api/v1/search`

```
GET /api/v1/search?q=<string>&limit=<int, default 10>
```

Retrieval goes through the RAG service (§5); the backend enriches each result from `bronze.events` / `bronze.videos`. **Response `200`:** `RagQueryResult`, as observed on 2026-09-29:

```ts
{
  answer: string;              // natural-language summary → first assistant message in Results
  results: RagResultItem[];
}
RagResultItem = {
  video_id: string;
  video_url: string | null;    // played directly in a <video> element
  start_seconds: number;       // where the matching moment starts inside the video
  end_seconds: number;
  caption: string;             // the RAG's text for why this moment matched
  score: number;               // 0–1
  event_id: string | null;     // bronze.events.event_id
  event_name: string | null;   // e.g. "Person walks toward a door"
  description: string | null;  // bronze.events.description
  camera: string | null;       // e.g. "G331"
  scene: string | null;        // e.g. "bus"
  thumbnail_url: string | null; // null so far
  tags: string[] | null;       // ClipTag values, e.g. ["Person"]
}
```

**How the frontend uses it** (`ragResultItemToClip` in `src/lib/api/normalize.ts`):

| Frontend field                           | From                                        | Notes                                                                                                                   |
| ---------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                                     | `event_id`, else `video_id:start_seconds`   | If two results share an event, the second gets `:start_seconds` appended so ids stay unique (`searchClips`).            |
| `eventId`                                | `event_id`                                  | Sent as `event_id` to `/videos/{id}/tracks` (only that event's objects). It is also the id for `/clips/{id}`.           |
| `videoUrl`, `startSeconds`, `endSeconds` | `video_url`, `start_seconds`, `end_seconds` | The player loads the video and seeks to the moment.                                                                     |
| title / action                           | `event_name`, else `caption`                | —                                                                                                                       |
| `description`, `caption`                 | `description`, `caption`                    | Description is shown in the chunk metadata. The caption is what the assistant endpoints receive.                        |
| `camera`, `code`                         | `camera`                                    | Falls back to "Unknown" only if missing.                                                                                |
| `scene`                                  | `scene`                                     | Shown with the camera, on the player, in metadata and in the directory.                                                 |
| `tags`, objects                          | `tags` (unknown values dropped)             | Falls back to keyword-matching the caption when `tags` is missing.                                                      |
| `ts`, `date`                             | `start_seconds`                             | `ts` is the offset into the video (`2:49`), and `date` is empty. There is no wall-clock time: it isn't in the database. |
| thumbnail                                | `thumbnail_url`                             | While it is `null`, a placeholder image is shown.                                                                       |
| `confidence`                             | `round(score × 100)`                        | —                                                                                                                       |

**Side effects (per the backend's own docs):** the call writes a recent-query row and bumps `hits` on a saved query with the same text. Neither has been verified against a live authenticated call.

### `GET /api/v1/clips/{id}`

`id` is the bronze event id. Returns `404` when unknown. **Response `200`:** `Clip` (§6), already normalized by the backend. **Please add `scene`** (`bronze.videos.scene`); the frontend already reads it.

The Clip Detail page renders it on the server with the user's token. The page registers the clip in the store, so the assistant on that page can answer about it (see §3.2).

### `GET /api/v1/clips/{id}/related`

Query `limit` (1–20, default 4). The relatedness heuristic is owned by the backend ("same camera, closest in time"). **Response:** `ClipListResponse` `{ clips: Clip[] }`.

### `GET /api/v1/cameras`

No params. **Response:** `CamerasResponse` `{ cameras: { code, eventCount, scene }[] }`. Fetched when the Cameras modal opens. **Please add `scene`** (`bronze.videos.scene`, see §4.1), so the directory can group cameras by site. `eventCount` can come from counting `bronze.events` per `videos.camera_id`.

### `GET /api/v1/queries/recent`

Read-only; rows come from `/search`. **Response:** `RecentQueriesResponse` `{ queries: { id, text, ts, cameras }[] }`.

- **Please add a `limit` query param.** Home shows the **3** newest. Today the frontend fetches every row, sorts them newest first by `ts`, and keeps 3 (`getRecentQueries(limit)` already takes the limit, ready to pass it through).
- **Please send `ts` as ISO 8601**, in UTC or with an offset. The frontend shows it relative to now ("just now", "10 min ago", "2 hours ago", "3 days ago", then "Sep 21" after a week), refreshed every minute. A value without an offset is read as UTC; anything that isn't ISO is shown as-is.

### `GET /api/v1/queries/saved`

**Response:** `SavedQueriesResponse` `{ queries: SavedQueryOut[] }`, where `SavedQueryOut` is `{ id, text, savedOn, hits }`. `savedOn` is a plain string: the frontend formats ISO timestamps as `Sep 24` and shows any other value as-is. **Please send ISO 8601.**

### `POST /api/v1/queries/saved`

**Request:** `{ "text": string }`. **Response `201`:** `SavedQueryOut`, with `hits` starting at 0.

The frontend saves from a bookmark beside the original query bubble in the Results thread and in the Clip Detail assistant.

---

## 3. Endpoints added for this frontend

As of 2026-09-29, all four are live in the backend. All four are wired in the frontend; the simulations remain only behind the screen tests.

### 3.1 `DELETE /api/v1/queries/saved/{id}`

**Live and wired (2026-09-29).** `deleteSavedQuery()` in `src/lib/api/endpoints.ts` backs the delete button, which has a confirmation step, on every Saved Queries row. On success the row disappears. A `404` is treated as already deleted. Any other error keeps the row and says why.

- **Request:** no body. `{id}` is `SavedQueryOut.id`, URL-encoded.

| Status           | When                                                                                                                      | Frontend behaviour                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `204 No Content` | Deleted                                                                                                                   | Row removed                                                                   |
| `404 Not Found`  | No such id **for this user**, including another user's query. Return 404, not 403, so ids of other users aren't revealed. | Treated as already deleted: row removed. A retry or double click is harmless. |
| `401` / `403`    | Token problem                                                                                                             | Error shown, row kept                                                         |

- **Scope to the caller.** Delete only the caller's own row.
- **Hard delete.** Saved queries are bookmarks, not evidence. Log the deletion to the audit log if required.
- **Leave recent queries alone.** Deleting a saved query must not touch `/queries/recent`.

### 3.2 `POST /api/v1/assistant/ask` — conversational assistant (**RAG**)

**Live and wired (2026-09-29).** The Results chat and the Clip Detail assistant call it through `askAssistant()` in `src/lib/api/endpoints.ts`. It is stateless: every call carries the whole context. Types: `src/lib/api/types.ts`. The old simulation (`answerQuestion` in `src/lib/api/mocks/assistant.ts`) now only backs the screen tests.

**Request**

```ts
{
  query: string;                       // the search that produced the moments
  question: string;                    // what the investigator asked (typed or a suggestion)
  scope: "results" | "moment";         // all moments on screen, or one moment
  focus_moment_id: string | null;      // required when scope = "moment"
  moments: AssistantMoment[];          // context: the moments on screen (top 10 matches)
  history: { role: "user" | "assistant"; text: string }[];  // earlier turns, oldest first
}

AssistantMoment = {
  moment_id: string;                   // the frontend's id; cite moments by this
  video_id: string;
  start_seconds: number;
  end_seconds: number | null;
  caption: string;
  score: number;                       // 0–1, as /search returned it
  camera: string | null;               // null until /search returns cameras
}
```

**Response `200`**

```ts
{
  answer: string;
  citations: { moment_id: string }[];  // moments the answer is about → "jump to" buttons
  suggested_questions: string[];       // follow-ups shown under the answer; keep it to about 3
}
```

**What the backend/RAG has to do**

- **Answer from the context.** Use `moments`, `history`, and (for `scope: "moment"`) the focused moment. The frontend sends the moments on screen, so the endpoint can stay stateless. The alternative is a `search_id` returned by `/search`, which keeps requests small but makes the backend store every result set. Pick one and tell us.
- **Cite only ids you received.** The frontend drops unknown `moment_id`s.
- **Handle both scopes.** With `scope: "results"`, answer about the whole result set, e.g. _"Which camera has the most matches?"_ or _"Narrow this to vehicle events only"_. With `scope: "moment"`, answer about the focused moment, e.g. _"Did anyone leave the building before this?"_, _"Show this vehicle's full path across cameras"_, _"Who else was near this location around this time?"_, _"Jump to the next flagged event on this camera"_.
  - Some of these need data that doesn't exist: there is no wall-clock time in the database, and no link that re-identifies the same vehicle or person across cameras. They are backend/RAG work. The simulation says so in its answers instead of inventing results.
- **Return follow-ups** suited to the scope in `suggested_questions`. These appear under each answer; the questions shown **before** anything is asked come from §3.4.
- **Errors:** any non-2xx shows _"The assistant couldn't answer that. Try again."_ in the thread. Expect one request at a time per thread; the UI blocks a second question while one is pending.

**The opening message on Clip Detail** is still built locally (`summarizeClip()` in `src/lib/assistant.ts`) from the clip's fields. Proposal: generate it with this same endpoint, sending `scope: "moment"`, `question = <the original search>` and an empty `history`, instead of adding another endpoint. The frontend will wire that once §3.2 is live.

### 3.3 `GET /api/v1/videos/{video_id}/tracks` — highlight objects on the player

**Live and wired (2026-09-29).** Draws a box around what the search found while the footage plays. `getTracks()` in `src/lib/api/endpoints.ts` feeds `DetectionOverlay` for the moment on the player. Real responses carry no `simulated` flag, so the boxes no longer say SIMULATED. The data comes from `bronze.event_objects` → `bronze.objects` → `bronze.geometries`.

**Please confirm:** the frontend draws `x`, `y` as the box's **top-left corner**, as specified below. If the backend sends the centre instead, every box will be offset by half its size.

**Request**

```
GET /api/v1/videos/{video_id}/tracks?start_seconds=<number>&end_seconds=<number>[&event_id=<string>]
```

- `video_id`, `start_seconds`, `end_seconds`: what `/search` returns today, so this works before §4.1.
- `event_id` (preferred, once `/search` returns it): return **only that event's objects**, which is exactly "what was searched". Without it, return the objects of every event of that video that overlaps the window.

**Response `200`:** `TracksResponse`

```ts
interface TracksResponse {
  video_id: string;
  frame_width: number; // bronze.videos.frame_width: the coordinate space of every box
  frame_height: number; // bronze.videos.frame_height
  objects: ObjectTrack[];
}

interface ObjectTrack {
  object_id: string; // bronze.objects.object_id
  label: string; // geometries.label or objects.label_details, e.g. "person", "vehicle"
  boxes: TrackBox[]; // sorted by t
}

interface TrackBox {
  t: number; // geometries.timestamp_seconds: seconds into the same file as video_url
  x: number; // top-left corner and size, in source-frame pixels
  y: number;
  w: number;
  h: number;
  confidence: number | null; // geometries.confidence, 0–1
}
```

**Reference query** (`bronze.objects` has no `video_id`, so the video is reached through the event):

```sql
select o.object_id, g.label, g.timestamp_seconds as t, g.bounding_box_pixels, g.confidence
from bronze.events e
join bronze.event_objects eo on eo.event_id = e.event_id
join bronze.objects o        on o.object_id = eo.object_id
join bronze.geometries g     on g.object_id = o.object_id
where e.video_id = :video_id
  and (:event_id is null or e.event_id = :event_id)
  and g.timestamp_seconds between :start_seconds and :end_seconds
order by o.object_id, g.timestamp_seconds;
```

**Requirements**

- **Normalize the boxes.** `bounding_box_pixels` is `jsonb`, and the frontend doesn't know its format. Convert it to `{ x, y, w, h }` (top-left corner + size) in the source frame's pixels.
- **Use the same time base** as `start_seconds` and `video_url`: seconds into that file. If `timestamp_seconds` counts from somewhere else, convert it. `frame_index / fps` is the fallback.
- **Downsample.** `geometries` is per frame (~30 per second). Send at most ~10 boxes per second per object; the frontend interpolates between them, so motion stays smooth.
- **Empty is fine.** Return `objects: []` when nothing was detected, and the player simply shows no overlay.
- **Does not call the RAG.** This is a database read.

### 3.4 `POST /api/v1/assistant/suggestions` — opening suggested questions (**RAG**)

**Live and wired (2026-09-29).** Before anything is asked, the chat offers a few questions to start with. That happens after a search, when a moment is selected in Results, and when Clip Detail opens. They used to be two hardcoded lists; the frontend now asks for them per context through `suggestQuestions()` in `src/lib/api/endpoints.ts`, once per context.

**Difference from what this spec asked:** the backend builds them **from rules, not the RAG/LLM** (per its OpenAPI description). The contract is the same, so moving to RAG-generated suggestions later needs no frontend change.

**Request:** the same context as `/assistant/ask` (§3.2), without `question`.

```ts
{
  query: string;
  scope: "results" | "moment";
  focus_moment_id: string | null;      // required when scope = "moment"
  moments: AssistantMoment[];          // the moments on screen
  history: { role: "user" | "assistant"; text: string }[];  // e.g. the search and its summary
}
```

**Response `200`**

```ts
{ suggested_questions: string[] }      // about 3, most useful first
```

**When the frontend calls it:** once per context: the search plus the selected moment, or the clip on Clip Detail. The result is cached, and questions already asked in the thread are filtered out. Follow-ups after an answer keep coming from `/assistant/ask`, so this endpoint is only for the opening questions.

**What the RAG has to do**

- **Suggest questions it can answer** from the moments and the scope. With `scope: "moment"`, suggest questions about the focused moment, e.g. its path across cameras for a vehicle, or who else was nearby.
- **Only suggest what the data supports.** Don't offer to compare cameras when there's one camera, to filter vehicles when there are none, or anything that needs wall-clock time (not in the database) or cross-camera re-identification (§5).
- **Skip questions already in `history`.**
- **Optional optimization:** `/search` could return `suggested_questions` next to `answer`, which saves this call right after a search. The endpoint is still needed for moment selection and Clip Detail.

---

## 4. Changes requested to live endpoints

### 4.1 `/search` should return normalized moments (**RAG**) — mostly done

**Status (2026-09-29):** `event_id`, `event_name`, `description`, `camera`, `scene` and `tags` are returned and used. Still pending: `thumbnail_url` (comes back `null`) and the filter params below. `timestamp` and `perspective` are **dropped**: they aren't in the database, and the frontend no longer uses them.

The frontend can't fill these gaps itself, but **almost all of this data already exists in the `bronze` schema**. The RAG returns `video_id` + `start_seconds`; the backend has to join each result with `bronze.events` and `bronze.videos` before responding. Add to each result:

| Field                       | Source in the database                                                                                                                                                                            | Why the frontend needs it                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `event_id`                  | `bronze.events.event_id` — match on `video_id` and the event whose `[start_seconds, end_seconds]` contains the RAG's `start_seconds`; or have the RAG index events and return `event_id` directly | To open `/clips/{event_id}` from a result. Today no result can open the Clip Detail page, because `video_id` isn't an event id. |
| `event_name`                | `bronze.events.event_name`                                                                                                                                                                        | Card title. The frontend already reads it when present, and falls back to `caption`.                                            |
| `description`               | `bronze.events.description`                                                                                                                                                                       | A fuller text than the RAG `caption`, for the assistant and the detail page.                                                    |
| `camera`                    | `bronze.videos.camera_id`                                                                                                                                                                         | Every card, chip and assistant answer shows "Unknown" today.                                                                    |
| `scene`                     | `bronze.videos.scene`, which holds the MEVA site (the `admin` in `….admin.G329.r13.avi`); please confirm                                                                                          | Shown with the camera ("G329 · admin") and usable as a filter. This replaces the precinct idea (§7).                            |
| `thumbnail_url`             | No column: extract the frame at `start_seconds` (e.g. ffmpeg) and store it next to the video                                                                                                      | Match cards show a placeholder image.                                                                                           |
| `tags` (the `ClipTag` enum) | Object labels via `bronze.event_objects` → `bronze.objects.label_details`, and/or MEVA activity types (`bronze.ground_truth.activity_type`, `bronze.matched_pairs.meva_reference`)                | The frontend guesses tags from the caption today.                                                                               |

**Filters.** The Filters modal (camera, scene, event type, minimum confidence) and the inline term menus in the search field set filters that `/search` ignores, because it only accepts `q` and `limit`. Add optional params: `cameras` (repeatable, `videos.camera_id`), `scenes` (repeatable, `videos.scene`), `tags` (repeatable) and `min_confidence` (0–100). Pass them to the RAG as metadata filters, so they aren't applied after retrieval. The frontend will send them as soon as the params exist. **Open — date filters:** the Filters modal still has a From/To date range, but there is no wall-clock time to filter against, so `/search` gets no date params for now. This may become a backend request later.

**Video URLs.** `video_url` is loaded by a plain `<video>` element, which can't send the bearer token. It must be public or a **signed URL** that expires after a while. `bronze.videos` has `storage_bucket` and `storage_path`, so the backend can sign a URL per request (for example with Supabase Storage `createSignedUrl`) instead of returning the stored `video_url`. The file host must allow HTTP range requests. MP4s should be encoded with `-movflags +faststart`; otherwise seeking to `start_seconds` waits for most of the file to download.

### 4.2 Typed list envelopes — ✅ resolved (2026-09-29)

All four list endpoints now declare response models: `ClipListResponse { clips }`, `CamerasResponse { cameras }`, `RecentQueriesResponse { queries }` and `SavedQueriesResponse { queries }`. They match the keys the frontend reads. `listFrom()` still accepts a bare array; that fallback can go.

### 4.3 `POST /queries/saved` — duplicates

The bookmark remembers "saved" only while the component is mounted. Saving the same query again after navigating away creates a duplicate row. Make saves idempotent per `(user, text)`: return the existing row with `200`, or reject with `409`. The frontend handles either.

---

## 5. RAG integration — everything that goes through the RAG

| #   | Where                         | What the RAG must provide                                                                                                                                                                                                                                                  | Status                                             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `GET /search`                 | Retrieval over indexed footage: ranked moments plus the `answer` summary shown as the first assistant message in Results                                                                                                                                                   | ✅ Live (pass-through)                             |
| 2   | `GET /search`                 | Normalized moment metadata joined from `bronze.events`/`bronze.videos`: event id, event name, camera, scene, thumbnail, tags (§4.1)                                                                                                                                        | 🟡 Mostly live · thumbnail still null              |
| 3   | `GET /search`                 | Metadata filters: cameras, scenes, event types, confidence, dates (§4.1)                                                                                                                                                                                                   | 🔴 Missing                                         |
| 4   | `GET /search` side effects    | Write a recent-query row; bump `hits` on a matching saved query                                                                                                                                                                                                            | Documented by the backend, unverified              |
| 5   | `POST /assistant/ask`         | Grounded answers over the moments on screen, with citations and follow-up questions, for the whole result set or one moment (§3.2)                                                                                                                                         | ✅ Live and wired                                  |
| 6   | `POST /assistant/suggestions` | Opening suggested questions for the context (after a search, a selected moment, Clip Detail), limited to what the data can answer (§3.4)                                                                                                                                   | ✅ Live and wired · rule-based, not RAG yet        |
| 7   | `POST /assistant/ask`         | Cross-camera reasoning: same vehicle or person across cameras, "before/after this", "near this scene". Within one video, `bronze.objects` and `bronze.geometries` (bounding boxes, `spatial_position`) support it; across cameras the schema has no re-identification link | 🟡 Proposed; needs re-identification and time data |
| 8   | Clip Detail opening message   | Summary of one moment against the original search (via #5)                                                                                                                                                                                                                 | 🟡 Proposed; built locally today                   |
| 9   | `video_url`                   | Playable, signed, seekable footage URLs (§4.1)                                                                                                                                                                                                                             | ⚠️ Works when public; signing not specified        |

---

## 6. Data model reference

**`Clip`**, as returned by `GET /clips/{id}` and `/clips/{id}/related`:

```ts
{
  id: string;                  // bronze.events.event_id
  camera: string;
  code: string;
  ts: string;                  // "HH:MM:SS"
  date: string;
  order: number;
  confidence: number;          // 0–100
  tags: ClipTag[];             // "Person" | "Vehicle" | "Entry" | "Exit" | "Loitering" | "Object Left"
  objects: string;
  action: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  scene?: string;              // requested (§4.1): bronze.videos.scene
}
```

**Other shapes:**

- **`CameraDirectoryEntry`:** `{ code, eventCount, scene? }`
- **`perspective`:** the backend's `Clip` and `CameraDirectoryEntry` schemas still include it, but it isn't in the database and the frontend ignores it. Consider dropping it from those schemas.
- **`RecentQuery`:** `{ id, text, ts, cameras }`
- **`SavedQueryOut`:** `{ id, text, savedOn, hits }`
- **`RagQueryResult`, `RagResultItem`, `AssistantMoment`** and the assistant request/response: see §2 and §3.2.

---

## 7. Frontend notes

- **API layer** (`src/lib/api/`):
  - `client.ts`: fetch wrapper, base URL, bearer token, `ApiError` with the HTTP status.
  - `endpoints.ts`: one function per endpoint.
  - `types.ts`: wire types, including the proposed contracts.
  - `normalize.ts`: RAG → `Clip` stopgap.
  - `mocks/assistant.ts`: test-only simulations of `/assistant/ask` and `/assistant/suggestions`, used by the screen tests.
  - `mocks/tracks.ts`: test-only simulation of `/videos/{video_id}/tracks`, used by the screen tests.
- **Stopgaps to delete** once the backend covers them:
  - `ragResultItemToClip`'s fallbacks for missing fields (§4.1).
  - The mock scene per demo camera (`cameraScenes` in `src/data/cameras.ts`). The UI already shows `scene` on match cards, the player, chunk metadata, clip detail, the camera directory (grouped by scene) and the Filters dialog (§4.1).
  - `summarizeClip` (§3.2).
  - `listFrom`'s bare-array fallback (§4.2, now resolved).
- **Precincts removed.** MEVA was recorded at a single facility (Muscatatuck Urban Training Center, Known Facility 1), and the `bronze` schema only has `camera_id` and `scene` per video, with no precinct, district or zone. The frontend removed the precinct selector and its data. No backend endpoint is needed; `scene` covers grouping by site (§4.1).
- **Results URL:** the search lives in `?q=`, so a refresh or a shared link re-runs `/search`. The backend sees the same query again; it isn't a new user action.
- **Tests** mock `@/lib/api/endpoints`, so no test hits the network.
