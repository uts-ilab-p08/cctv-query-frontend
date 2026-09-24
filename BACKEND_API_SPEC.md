# Backend API Specification

What the frontend consumes today, what it still needs, and every place the RAG service is involved.

**Scope:** Home (`/dashboard`), Results (`/results`), Clip Detail (`/clips/[id]`), Saved Queries (`/saved`) and the Cameras directory.
**Out of scope for now:** Reports and the Video Annotation Pipeline.

- **Base URL:** `NEXT_PUBLIC_API_BASE_URL`. Dev is `https://surveillance-backend-nodd.onrender.com`; a local backend is `http://localhost:8000`. Live docs are at `/docs`.
- **Auth:** every endpoint except `/health` requires `Authorization: Bearer <Supabase access token>`. The live backend returns `403 {"detail":"Not authenticated"}` without a token and `401 {"detail":"Invalid or expired token"}` for a bad one. The frontend attaches the token in `src/lib/api/client.ts`: the browser session on the client, and a server-resolved token for the `/clips/[id]` server component.
- **Last checked against the live `/openapi.json`:** 2026-09-24.

---

## 1. Status at a glance

| Endpoint                               | Status                                        | Used by (frontend)                                                                              | Calls the RAG                         |
| -------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| `GET /health`                          | ✅ Live                                       | Not used. Monitoring only, no screen needs it.                                                  | No                                    |
| `GET /api/v1/search`                   | ✅ Live · **changes requested** (§4.1)        | Search from Home, New Query, Recent/Saved "run again", and a Results refresh via `?q=`          | **Yes**: pass-through                 |
| `GET /api/v1/clips/{id}`               | ✅ Live                                       | Clip Detail page (server-rendered)                                                              | No                                    |
| `GET /api/v1/clips/{id}/related`       | ✅ Live · envelope untyped (§4.2)             | Clip Detail, "Related clips"                                                                    | No                                    |
| `GET /api/v1/cameras`                  | ✅ Live · envelope untyped (§4.2)             | Cameras directory modal                                                                         | No                                    |
| `GET /api/v1/queries/recent`           | ✅ Live · envelope untyped (§4.2)             | Home, "Recent queries"                                                                          | Written as a side effect of `/search` |
| `GET /api/v1/queries/saved`            | ✅ Live · envelope untyped (§4.2)             | Saved Queries screen                                                                            | No                                    |
| `POST /api/v1/queries/saved`           | ✅ Live · duplicate handling requested (§4.3) | Bookmark on the original query in the chat                                                      | No                                    |
| `DELETE /api/v1/queries/saved/{id}`    | 🟡 **Proposed** (§3.1)                        | Delete button on Saved Queries (UI ready; gets `405` today)                                     | No                                    |
| `POST /api/v1/assistant/ask`           | 🟡 **Proposed** (§3.2)                        | Results chat and Clip Detail assistant (**simulated** in the frontend today)                    | **Yes**                               |
| `POST /api/v1/assistant/suggestions`   | 🟡 **Proposed** (§3.4)                        | Opening suggested questions in the Results chat and Clip Detail assistant (**simulated** today) | **Yes**                               |
| `GET /api/v1/videos/{video_id}/tracks` | 🟡 **Proposed** (§3.3)                        | Box around the detected object on the Results player (**simulated** today, labelled SIMULATED)  | No (database)                         |

---

## 2. Live endpoints

### `GET /health`

No auth. Not called by the frontend. Keep it for uptime checks.

### `GET /api/v1/search`

```
GET /api/v1/search?q=<string>&limit=<int, default 10>
```

A thin pass-through to the RAG service (§5). **Response `200`:** `RagQueryResult`.

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
  caption: string;
  score: number;               // 0–1
}
```

**How the frontend uses it** (`src/lib/api/normalize.ts`, `ragResultItemToClip`). The results aren't `Clip`s, so the frontend derives one per result as a stopgap:

| Frontend field                           | Derived from                                | Limitation                                                                                                                  |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                                     | `` `${video_id}:${start_seconds}` ``        | One video can hold several moments, so `video_id` alone collides. **This is not an event id** and can't open `/clips/{id}`. |
| `videoUrl`, `startSeconds`, `endSeconds` | `video_url`, `start_seconds`, `end_seconds` | The player loads the video and seeks to the moment.                                                                         |
| `ts` (time shown)                        | `start_seconds` as `m:ss`                   | This is the **offset into the video**, not a wall-clock time.                                                               |
| `confidence`                             | `round(score × 100)`                        | —                                                                                                                           |
| title                                    | `event_name` if present, else `caption`     | `event_name` isn't in the contract; the frontend reads it if it appears.                                                    |
| `scene`                                  | `scene` if present                          | Not returned yet (requested in §4.1); the frontend reads it when it appears.                                                |
| `camera`, `code`, `perspective`          | `"Unknown"`                                 | Not returned, so every card and chip shows "Unknown".                                                                       |
| `tags`                                   | keyword match on `caption`                  | Best effort; can misclassify.                                                                                               |
| `date`                                   | `""`                                        | Not returned.                                                                                                               |
| thumbnail                                | placeholder image                           | Not returned.                                                                                                               |

**Side effects (per the backend's own docs):** the call writes a recent-query row and bumps `hits` on a saved query with the same text. Neither has been verified against a live authenticated call.

### `GET /api/v1/clips/{id}`

`id` is the bronze event id. Returns `404` when unknown. **Response `200`:** `Clip` (§6), already normalized by the backend. **Please add `scene`** (`bronze.videos.scene`); the frontend already reads it.

The Clip Detail page renders it on the server with the user's token. The page registers the clip in the store, so the assistant on that page can answer about it (see §3.2).

### `GET /api/v1/clips/{id}/related`

Query `limit` (1–20, default 4). The relatedness heuristic is owned by the backend ("same camera, closest in time"). **Response:** a list of `Clip`. The envelope is untyped (§4.2).

### `GET /api/v1/cameras`

No params. **Response:** a list of `{ code, perspective, eventCount }`. The envelope is untyped (§4.2). Fetched when the Cameras modal opens. **Please add `scene`** (`bronze.videos.scene`, see §4.1), so the directory can group cameras by site. `eventCount` can come from counting `bronze.events` per `videos.camera_id`.

### `GET /api/v1/queries/recent`

Read-only; rows come from `/search`. **Response:** a list of `{ id, text, ts, cameras }`. The envelope is untyped (§4.2).

### `GET /api/v1/queries/saved`

**Response:** a list of `SavedQueryOut` `{ id, text, savedOn, hits }`. The envelope is untyped (§4.2). `savedOn` is a plain string: the frontend formats ISO timestamps as `Sep 24` and shows any other value as-is. **Please send ISO 8601.**

### `POST /api/v1/queries/saved`

**Request:** `{ "text": string }`. **Response `201`:** `SavedQueryOut`, with `hits` starting at 0.

The frontend saves from a bookmark beside the original query bubble in the Results thread and in the Clip Detail assistant.

---

## 3. Pending endpoints (to implement)

### 3.1 `DELETE /api/v1/queries/saved/{id}`

The frontend is ready (`deleteSavedQuery()` in `src/lib/api/endpoints.ts`, with a delete button and a confirmation step on every row). Until this endpoint exists the backend answers `405`, and the screen says _"Deleting saved queries isn't available yet"_.

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

**This is the main missing piece.** The Results chat and the Clip Detail assistant already run against this exact contract. The frontend uses a **simulation** that answers from the request alone (`src/lib/api/mocks/assistant.ts`), so the UI behaves as it will with the real service. To switch over, replace the body of `askAssistant()` in `src/lib/api/endpoints.ts` with the `apiFetch` call already written in its comment. Types: `src/lib/api/types.ts`.

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
  - Several of these need data the frontend doesn't have: cameras, wall-clock time, and cross-camera re-identification of the same vehicle or person. They are backend/RAG work. The simulation says so in its answers instead of inventing results.
- **Return follow-ups** suited to the scope in `suggested_questions`. These appear under each answer; the questions shown **before** anything is asked come from §3.4.
- **Errors:** any non-2xx shows _"The assistant couldn't answer that. Try again."_ in the thread. Expect one request at a time per thread; the UI blocks a second question while one is pending.

**The opening message on Clip Detail** is still built locally (`summarizeClip()` in `src/lib/assistant.ts`) from the clip's fields. Proposal: generate it with this same endpoint, sending `scope: "moment"`, `question = <the original search>` and an empty `history`, instead of adding another endpoint. The frontend will wire that once §3.2 is live.

### 3.3 `GET /api/v1/videos/{video_id}/tracks` — highlight objects on the player

Draws a box around what the search found while the footage plays. **The data already exists**: `bronze.event_objects` links an event to its objects, and `bronze.geometries` has one bounding box per object per frame. The frontend is ready: `getTracks()` in `src/lib/api/endpoints.ts` feeds `DetectionOverlay`. Today it runs on a **simulation** (`src/lib/api/mocks/tracks.ts`), and every simulated box is labelled **SIMULATED**, because its path is invented and doesn't follow anything in the footage.

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

Before anything is asked, the chat offers a few questions to start with. That happens after a search, when a moment is selected in Results, and when Clip Detail opens. They used to be two **hardcoded lists** of four questions, the same for every search. So the UI could offer _"Which camera has the most matches?"_ when every result came from one camera, or _"Narrow this to vehicle events only"_ with no vehicle in sight. The frontend now asks for them per context (`suggestQuestions()` in `src/lib/api/endpoints.ts`), against a **simulation** that picks only questions that fit the moments (`src/lib/api/mocks/assistant.ts`).

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
- **Only suggest what the data supports.** Don't offer to compare cameras when there's one camera, to filter vehicles when there are none, or anything that needs wall-clock time or re-identification until those exist (§4.1, §5).
- **Skip questions already in `history`.**
- **Optional optimization:** `/search` could return `suggested_questions` next to `answer`, which saves this call right after a search. The endpoint is still needed for moment selection and Clip Detail.

---

## 4. Changes requested to live endpoints

### 4.1 `/search` should return normalized moments (**RAG**)

The frontend can't fill these gaps itself, but **almost all of this data already exists in the `bronze` schema**. The RAG returns `video_id` + `start_seconds`; the backend has to join each result with `bronze.events` and `bronze.videos` before responding. Add to each result:

| Field                               | Source in the database                                                                                                                                                                            | Why the frontend needs it                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `event_id`                          | `bronze.events.event_id` — match on `video_id` and the event whose `[start_seconds, end_seconds]` contains the RAG's `start_seconds`; or have the RAG index events and return `event_id` directly | To open `/clips/{event_id}` from a result. Today no result can open the Clip Detail page, because `video_id` isn't an event id. |
| `event_name`                        | `bronze.events.event_name`                                                                                                                                                                        | Card title. The frontend already reads it when present, and falls back to `caption`.                                            |
| `description`                       | `bronze.events.description`                                                                                                                                                                       | A fuller text than the RAG `caption`, for the assistant and the detail page.                                                    |
| `camera`                            | `bronze.videos.camera_id`                                                                                                                                                                         | Every card, chip and assistant answer shows "Unknown" today.                                                                    |
| `scene`                             | `bronze.videos.scene`, which holds the MEVA site (the `admin` in `….admin.G329.r13.avi`); please confirm                                                                                          | Shown with the camera ("G329 · admin") and usable as a filter. This replaces the precinct idea (§7).                            |
| `code`, `perspective`               | Not in the schema; possibly `bronze.videos.source_metadata`                                                                                                                                       | Used by the Clip model (§6). If they don't exist, say so and the frontend drops them.                                           |
| `timestamp` (ISO 8601, with offset) | `bronze.videos.capture_start_local + events.start_seconds`, in `capture_time_zone`                                                                                                                | Moments show their offset into the video (`0:12`). "What's the most recent match?" can't be answered without wall-clock time.   |
| `thumbnail_url`                     | No column: extract the frame at `start_seconds` (e.g. ffmpeg) and store it next to the video                                                                                                      | Match cards show a placeholder image.                                                                                           |
| `tags` (the `ClipTag` enum)         | Object labels via `bronze.event_objects` → `bronze.objects.label_details`, and/or MEVA activity types (`bronze.ground_truth.activity_type`, `bronze.matched_pairs.meva_reference`)                | The frontend guesses tags from the caption today.                                                                               |

**Filters.** The Filters modal (camera, event type, minimum confidence, date range) and the inline term menus in the search field set filters that `/search` ignores, because it only accepts `q` and `limit`. Add optional params: `cameras` (repeatable, `videos.camera_id`), `scenes` (repeatable, `videos.scene`), `tags` (repeatable), `min_confidence` (0–100), `date_from`, `date_to` (ISO dates, against the wall-clock `timestamp`). Pass them to the RAG as metadata filters, so they aren't applied after retrieval. The frontend will send them as soon as the params exist.

**Video URLs.** `video_url` is loaded by a plain `<video>` element, which can't send the bearer token. It must be public or a **signed URL** that expires after a while. `bronze.videos` has `storage_bucket` and `storage_path`, so the backend can sign a URL per request (for example with Supabase Storage `createSignedUrl`) instead of returning the stored `video_url`. The file host must allow HTTP range requests. MP4s should be encoded with `-movflags +faststart`; otherwise seeking to `start_seconds` waits for most of the file to download.

### 4.2 Typed list envelopes

`/clips/{id}/related`, `/cameras`, `/queries/recent` and `/queries/saved` are untyped `object`s in the OpenAPI schema (no `response_model`). The frontend accepts both `{ clips | cameras | queries: [...] }` and a bare array (`listFrom()` in `src/lib/api/endpoints.ts`) and treats anything else as empty. **Please add response models** so the envelope is part of the contract; the frontend then drops the guesswork.

### 4.3 `POST /queries/saved` — duplicates

The bookmark remembers "saved" only while the component is mounted. Saving the same query again after navigating away creates a duplicate row. Make saves idempotent per `(user, text)`: return the existing row with `200`, or reject with `409`. The frontend handles either.

---

## 5. RAG integration — everything that goes through the RAG

| #   | Where                         | What the RAG must provide                                                                                                                                                                                                                                                  | Status                                             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `GET /search`                 | Retrieval over indexed footage: ranked moments plus the `answer` summary shown as the first assistant message in Results                                                                                                                                                   | ✅ Live (pass-through)                             |
| 2   | `GET /search`                 | Normalized moment metadata joined from `bronze.events`/`bronze.videos`: event id, event name, camera, scene, wall-clock time, thumbnail, tags (§4.1)                                                                                                                       | 🔴 Missing                                         |
| 3   | `GET /search`                 | Metadata filters: cameras, scenes, event types, confidence, dates (§4.1)                                                                                                                                                                                                   | 🔴 Missing                                         |
| 4   | `GET /search` side effects    | Write a recent-query row; bump `hits` on a matching saved query                                                                                                                                                                                                            | Documented by the backend, unverified              |
| 5   | `POST /assistant/ask`         | Grounded answers over the moments on screen, with citations and follow-up questions, for the whole result set or one moment (§3.2)                                                                                                                                         | 🟡 Proposed; simulated in the frontend             |
| 6   | `POST /assistant/suggestions` | Opening suggested questions for the context (after a search, a selected moment, Clip Detail), limited to what the data can answer (§3.4)                                                                                                                                   | 🟡 Proposed; simulated in the frontend             |
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
  perspective: string;
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

- **`CameraDirectoryEntry`:** `{ code, perspective, eventCount, scene? }` (`scene` requested, §2)
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
  - `mocks/assistant.ts`: the `/assistant/ask` and `/assistant/suggestions` simulations.
  - `mocks/tracks.ts`: the `/videos/{video_id}/tracks` simulation.
- **Stopgaps to delete** once the backend covers them:
  - `ragResultItemToClip` (§4.1).
  - The assistant simulations (§3.2, §3.4).
  - The tracks simulation (§3.3).
  - The mock scene per demo camera (`cameraScenes` in `src/data/cameras.ts`). The UI already shows `scene` on match cards, the player, chunk metadata, clip detail, the camera directory (grouped by scene) and the Filters dialog (§4.1).
  - `summarizeClip` (§3.2).
  - `listFrom` envelope guessing (§4.2).
- **Precincts removed.** MEVA was recorded at a single facility (Muscatatuck Urban Training Center, Known Facility 1), and the `bronze` schema only has `camera_id` and `scene` per video, with no precinct, district or zone. The frontend removed the precinct selector and its data. No backend endpoint is needed; `scene` covers grouping by site (§4.1).
- **Results URL:** the search lives in `?q=`, so a refresh or a shared link re-runs `/search`. The backend sees the same query again; it isn't a new user action.
- **Tests** mock `@/lib/api/endpoints`, so no test hits the network.
