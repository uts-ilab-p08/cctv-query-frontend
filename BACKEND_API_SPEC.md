# Backend API Specification — Home, Results/Detail & Saved Queries

Scope of this document: only the endpoints needed for three screens —

1. **Home** (`/dashboard` — query composer + recent queries)
2. **Results / Clip Detail** (`/results`, `/clips/[clipId]` — video review + conversational assistant)
3. **Saved Queries** (`/saved`)

Everything else (annotation pipeline/jobs, reports, precincts, etc.) is intentionally left out. Cameras Directory (§4) was added because it's fully implemented and reachable from both in-scope screens.

**Authentication is out of scope.** Auth/session handling is implemented separately with Supabase. Every endpoint below except `/health` requires `Authorization: Bearer <token>` (confirmed against the live backend — unauthenticated requests get `403 {"detail":"Not authenticated"}`, invalid tokens get `401 {"detail":"Invalid or expired token"}`).

## Status: this is now the live, deployed contract

As of 2026-09-23, the backend at `https://surveillance-backend-nodd.onrender.com` implements every endpoint below (`/openapi.json` inspected directly) and the frontend has been wired to consume it (`src/lib/api/`). This section replaces the earlier version of this document, which described a target contract before implementation existed. Where the live backend's behavior differs from what was originally proposed, that's called out explicitly — **the frontend adapted to the real backend, not the other way around.**

Base path: `/api/v1`. Live docs: `https://surveillance-backend-nodd.onrender.com/docs`.

---

## 0. Environment configuration (new)

The frontend now reads the API base URL from `NEXT_PUBLIC_API_BASE_URL` instead of hardcoding it, so it can point at different backends per environment:

| File | Committed? | Purpose |
|---|---|---|
| `.env.example` | Yes | Documents the variable and the value for each environment |
| `.env.local` | No (gitignored) | Actual value used by `next dev` on this machine |

Current values:
- **Dev (current default):** `https://surveillance-backend-nodd.onrender.com` — the shared Render deployment.
- **Local backend (once running):** `http://localhost:8000`
- **Prod (future):** whichever host the Render deployment is promoted to, or a dedicated prod host.

To switch environments, edit `.env.local` and restart `next dev` — no code changes needed. The client that reads this (`src/lib/api/client.ts`) throws a clear error if the variable is unset, rather than silently calling a wrong/relative URL.

---

## 1. Data Model Reference

### `Clip` (as returned by the backend's `GET /clips/{id}` and `/clips/{id}/related`)

```ts
{
  id: string;                  // bronze.events.event_id — stable, backend-assigned
  camera: string;
  code: string;
  perspective: string;
  ts: string;                  // "HH:MM:SS"
  date: string;
  order: number;
  confidence: number;          // 0–100
  tags: ClipTag[];              // default []
  objects: string;
  action: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}
```

`ClipTag` = `"Person" | "Vehicle" | "Entry" | "Exit" | "Loitering" | "Object Left"` (enforced server-side as an enum on this schema).

**Deviation from the original proposal:** `id` is a **string** (the bronze event id), not a synthetic number. The frontend's `Clip.id`, `ChatKey`, and `ChatMessage.relatedId` types were migrated from `number` to `string` to match (`src/types/index.ts`).

### `RagResultItem` (raw shape from `GET /search` — see §2, this is NOT a `Clip`)

```ts
{
  video_id: string;
  video_url: string | null;
  start_seconds: number;
  end_seconds: number;
  caption: string;
  score: number;                // 0–1
}
```

### `RagQueryResult` (the actual response body of `GET /search`)

```ts
{ answer: string; results: RagResultItem[]; }
```

### `CameraDirectoryEntry`

```ts
{ code: string; perspective: string; eventCount: number; }
```

### `RecentQuery`

```ts
{ id: string; text: string; ts: string; cameras: number; }
```

### `SavedQuery` (backend: `SavedQueryOut`)

```ts
{ id: string; text: string; savedOn: string; hits: number; }
```

---

## 2. Home Screen (`/dashboard`)

Source: `src/components/dashboard/QueryComposer.tsx`, `RecentQueries.tsx`.

### `GET /api/v1/queries/recent`

Populates the "Recent Queries" list. Backend confirms this is **read-only by design** — rows are written only as a side effect of running a search, never created directly by the client.

**Response `200`:** shape is `{"type": "object"}` in the OpenAPI schema (no `response_model` attached) — unconfirmed exact envelope. The frontend (`getRecentQueries` in `src/lib/api/endpoints.ts`) assumes `{ queries: RecentQuery[] }` per the original spec and defaults to `[]` if that key is missing. **Verify this once an authenticated call can be made and correct the parsing if the real envelope differs.**

### `GET /api/v1/search` — **method changed from the original proposal**

The original spec proposed `POST /search` with a `{ query, filters }` body returning normalized `{ clips, summary }`. The implemented backend instead exposes:

```
GET /api/v1/search?q=<string>&limit=<int, default 10>
```

**No `filters` parameter exists on this endpoint today.** The backend's own docs describe it as a thin pass-through: *"The backend does no retrieval or LLM work itself — it forwards the query to the RAG service ... and passes the response straight through."*

**Response `200`:** `RagQueryResult` — i.e. `{ answer, results }` where `results` is `RagResultItem[]`, **not** `Clip[]`. The backend does not normalize RAG output into the `Clip` shape.

**Side effect:** per the backend's own docs, recent-query rows are written as a side effect of this call "once that's wired up to RAG." Confirmed as the intended design; not independently verified against a live authenticated call.

#### Frontend adaptation (`src/lib/api/normalize.ts`, `ragResultItemToClip`)

Since the backend returns raw `RagResultItem[]` and not `Clip[]`, the frontend normalizes client-side as a stopgap:

| `Clip` field | Derived from | Caveat |
|---|---|---|
| `id` | `video_id` | This identifies the **source video**, not a specific event within it — two results from the same video get the same `id`. Fine for `videoUrl` linking, but `GET /clips/{id}` (a real event id) and this `id` are **not interchangeable**. Do not use this `id` to call `getClipById`. |
| `confidence` | `Math.round(score * 100)` | Straight unit conversion |
| `ts` | `start_seconds` via `fmtClock()` | Uses the existing 50-minute demo window math in `src/lib/time.ts` — meaningless once real multi-day footage is indexed; needs revisiting |
| `objects`, `action` | both set to `caption` | The RAG gives one free-text field, not separate object/action breakdowns like the mock data has |
| `camera`, `code`, `perspective` | hardcoded `"Unknown"` | **Not present anywhere in `RagResultItem`.** This is the biggest gap — Results/MatchStrip render "Unknown" for every camera-related field until the backend enriches this response |
| `tags` | keyword-matched against `caption` | Best-effort regex (`car/vehicle` → Vehicle, `enter/arriv` → Entry, etc. — see `TAG_KEYWORDS` in `normalize.ts`). Not authoritative; can miss or misclassify |
| `date`, `order` | `""` / array index | No date info in the payload at all; `order` is just result position, not a real chronological ordering |
| `thumbnailUrl` | not set | RAG doesn't produce one |
| `videoUrl` | `video_url` | direct mapping — this one's solid |

**This normalization function is explicitly a stopgap** (documented as such in code) and should be deleted once `/search` returns backend-normalized `Clip[]` directly — which would also fix the `camera`/`code`/`perspective`/`date` gaps that the frontend cannot fill in on its own, since that data simply isn't in the RAG's response.

---

## 3. Results & Clip Detail Screens

Source: `src/components/results/ResultsScreen.tsx`, `QueryPanel.tsx`; `src/components/detail/ClipDetailScreen.tsx`, `RelatedClips.tsx`.

### 3.1 Result set

`ResultsScreen` now reads clips from the store's `results` field (`src/store/useAppStore.ts`), populated by `runSearch()` calling `GET /search` + normalizing (§2). No separate `GET /clips` (list) endpoint exists on the backend, and none was added to this spec — Results always follows a search, so this was never a hard requirement.

New store fields added for this integration: `results: Clip[]`, `searchPending: boolean`, `searchError: string | null` — `ResultsScreen` renders a loading state, an error state, or the match strip based on these.

### `GET /api/v1/clips/{id}`

Implemented as specified. `id` is the bronze event id (string). 404 on a stale/invalid id.

**Response `200`:** `Clip` (see §1) — this one **is** backend-normalized, unlike `/search`.

### `GET /api/v1/clips/{id}/related`

Implemented. Query param `limit` (1–20, default 4). Relatedness heuristic ("same camera, closest in time") is backend-owned, not frontend-specified.

**Response `200`:** untyped `object` in the schema (no `response_model`) — frontend assumes `{ clips: Clip[] }`, same caveat as §2's recent-queries envelope. Verify once testable.

### 3.2 Conversational assistant — **not implemented on the backend; frontend stays on mocks**

The backend has **no** `/assistant/query` or `/assistant/summarize-clip` endpoints (confirmed absent from `/openapi.json`). Per team decision, `askInResults`, `askAboutClip`, and `seedClipChat` in `src/store/useAppStore.ts` continue to call the local deterministic functions in `src/lib/assistant.ts` against the mock clip set (`src/data/clips.ts`), unchanged. This chat is **not** wired to real search results yet — it answers from the 16-clip demo dataset regardless of what `/search` actually returned. Revisit once the backend adds these endpoints.

---

## 4. Cameras Directory (modal, shared across screens)

Source: `src/components/modals/CamerasModal.tsx`.

### `GET /api/v1/cameras`

Implemented, no query params, requires auth (unlike the original spec draft, which didn't specify auth for this one — the live backend requires it like everything else except `/health`).

**Response `200`:** untyped `object` — frontend assumes `{ cameras: CameraDirectoryEntry[] }`.

`CamerasModal` now fetches on open (`useEffect` gated on `camerasOpen`) instead of reading the static `getCameraDirectory()` mock.

---

## 5. Saved Queries Screen (`/saved`)

Source: `src/components/saved/SavedQueriesScreen.tsx`.

### `GET /api/v1/queries/saved`

Implemented as specified. Response envelope also untyped in the schema — same `{ queries: [...] }` assumption.

### `POST /api/v1/queries/saved`

Implemented. Backend's own docs confirm the design decided earlier in this project: *"hits starts at 0: saving is a distinct action from running it ... `GET /search` increments hits when it sees a matching saved query re-run."* So the hit-count bump is **not** a separate call — it's a side effect the backend attaches to `/search` when the query text matches an existing saved query.

**Request body:**
```json
{ "text": "string" }
```

**Response `201`:** `SavedQueryOut` — `{ id, text, savedOn, hits }`.

Frontend function `saveQuery()` exists in `src/lib/api/endpoints.ts` but **no UI trigger calls it yet** — same gap noted in the original spec. The endpoint contract is ready; a "Save query" button still needs to be added to Home or Results.

---

## 6. Frontend integration notes (this pass)

- **New module:** `src/lib/api/` — `client.ts` (fetch wrapper: base URL from env, bearer auth header, error handling via `ApiError`), `types.ts` (raw wire types), `normalize.ts` (RAG→Clip stopgap mapping), `endpoints.ts` (one function per endpoint).
- **Auth stub:** `getAuthToken()` in `client.ts` currently returns `null`. Every authenticated call will fail with 401/403 until this is wired to read the real Supabase session token — this is the **only** change needed there; nothing else in the API layer references auth.
- **`Clip.id` type migration:** changed `number` → `string` across `src/types/index.ts`, the mock dataset (`src/data/clips.ts`), the store, and every component that threads a clip id (`ResultsScreen`, `QueryPanel`, `MatchStrip`, `PlayerBar`, `ClipDetailScreen`, the `/clips/[clipId]` route). `PipelineJob.id` (an unrelated, locally-generated numeric id) was **not** touched.
- **`generateStaticParams` removed** from `src/app/(app)/clips/[clipId]/page.tsx` — it depended on enumerating all mock clips at build time, which isn't possible against an authenticated live backend. The route is now fully dynamic (SSR/on-demand).
- **Tests:** `src/components/screens.test.tsx` mocks `@/lib/api/endpoints` wholesale so existing assertions keep exercising the mock dataset/deterministic assistant without hitting the network; `src/test/utils.ts`'s `resetStore()` was extended to reset the new `results`/`searchPending`/`searchError` fields between tests.

## 7. Known gaps / follow-ups

- `/search` needs to return backend-normalized `Clip[]` (with real `camera`/`perspective`/`date`) instead of raw `RagResultItem[]` — the frontend cannot reconstruct camera/perspective/date from what's currently returned.
- Three endpoints' response envelopes (`/clips/{id}/related`, `/cameras`, `/queries/recent`, `/queries/saved`) are untyped `object` in the OpenAPI schema — confirm the real key names once an authenticated call is possible, instead of relying on the frontend's `{ clips | cameras | queries: [...] }` assumption.
- Conversational assistant endpoints don't exist yet — chat stays mocked.
- No "Save query" UI trigger yet, even though the endpoint is ready.
- Supabase auth isn't wired in, so nothing beyond `/health` can actually be called successfully yet — this was expected going in, not a regression from this pass.

## 8. Out of Scope (for this pass)

- Authentication / login / session management (Supabase).
- Annotation pipeline (`/jobs`, `/models`, upload flow).
- Reports & stats (`/reports`, `/stats/summary`).
- Precincts.
