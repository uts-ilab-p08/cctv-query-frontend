# Surveillance Video Query AI

Internal tooling for police investigators: search CCTV metadata annotated by multimodal models
using natural language, review matching clips in a grid or timeline, inspect a clip alongside a
conversational assistant, and queue un-annotated footage into an annotation pipeline.

## Stack

| Concern    | Choice                                         |
| ---------- | ---------------------------------------------- |
| Framework  | Next.js 15 (App Router) + React 19             |
| Language   | TypeScript (strict, no `any`)                  |
| Styling    | Tailwind CSS v4 — tokens declared via `@theme` |
| State      | Zustand                                        |
| Icons      | lucide-react                                   |
| Class util | `clsx` + `tailwind-merge` (`cn()`)             |
| Testing    | Vitest + React Testing Library                 |
| Quality    | ESLint, Prettier (+ tailwindcss plugin), Husky |

## Setup

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /dashboard
```

| Script               | What it does                  |
| -------------------- | ----------------------------- |
| `npm run dev`        | Development server            |
| `npm run build`      | Production build              |
| `npm run lint`       | ESLint over the whole project |
| `npm run format`     | Prettier write                |
| `npm test`           | Vitest, single run            |
| `npm run test:watch` | Vitest in watch mode          |

The app is a desktop tool: the shell has a `min-w-[1280px]` floor and no mobile breakpoints.

## Structure

```
src/
  app/
    layout.tsx                 # fonts, canvas background, decorative orbs
    page.tsx                   # redirect → /dashboard
    globals.css                # @theme design tokens + base layer
    (app)/
      layout.tsx               # Sidebar + Topbar + scrollable <main> + modals
      dashboard/page.tsx       # 1. New Query
      results/page.tsx         # 2. Results (grid / timeline)
      clips/[clipId]/page.tsx  # 3. Clip Detail
      saved/page.tsx           # 4. Saved Queries
      reports/page.tsx         # 5. Reports
      pipeline/page.tsx        # 6. Video Annotation Pipeline
  components/
    layout/     Sidebar, Topbar, BackgroundOrbs
    ui/         GlassPanel, Button, Chip, Select, Input, Modal, StatCard,
                ProgressBar, SegmentedControl, SectionLabel, FieldLabel
    dashboard/  QueryComposer, KeywordChips, ActiveFilterChips, RecentQueries
    results/    ResultsScreen, ResultsToolbar, ClipGrid, ClipCard,
                ClipTimeline, FiltersModal, confidence.ts
    detail/     ClipDetailScreen, VideoPlayer, ClipMetaPanel, RelatedClips
    saved/      SavedQueriesScreen
    reports/    ReportsScreen
    pipeline/   PipelineScreen, UploadForm, ModelPicker, JobQueue, JobRow
    assistant/  QueryAssistant, ChatMessage, SuggestedQuestions
    modals/     SettingsModal, CamerasModal
  hooks/        usePipelineSimulation
  lib/          store.ts (Zustand), clips.ts, filters.ts, keywords.ts,
                assistant.ts, cn.ts
  data/         clips, cameras, savedQueries, recentQueries, reports,
                pipelineJobs, models, precincts, keywords, suggestedQuestions
  types/        index.ts
```

Navigation is real routing (`<Link>` / `useRouter`); the active sidebar item derives from
`usePathname()`. Components are Server Components unless they need interactivity.

### Design tokens

Every colour, font and radius lives in the `@theme` block of `src/app/globals.css` and is consumed
as a Tailwind utility (`text-ink-muted`, `border-border-input`, `bg-navy`). Reusable gradients are
utilities in the same file (`.bg-brand-gradient`, `.bg-accent-bar`, `.bg-mark-gradient`). No loose
hex values in components, and no inline `style` except for genuinely dynamic values — progress bar
widths and thumbnail URLs.

## Replacing the mocks with the real API

All data access is funnelled through pure functions, so the swap is confined to one layer.
Nothing in `src/components` imports from `src/data` for clip data; components call `src/lib`.

**The seam:**

| File                   | Responsibility                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/clips.ts`     | `getAllClips`, `getClipById`, `getRelatedClips`, `getCameraDirectory`, `getThumbUrl`, `getConfidenceLevel` |
| `src/lib/filters.ts`   | `filterClips`, `getActiveFilterChips` — pure, unit-tested                                                  |
| `src/lib/keywords.ts`  | `detectKeywords` — pure, unit-tested                                                                       |
| `src/lib/assistant.ts` | `summarizeResults`, `summarizeClip`, `answerForClip`, `answerForResults`                                   |

**Steps against a FastAPI backend:**

1. **Move filtering server-side.** `filterClips` currently narrows an in-memory array. Send
   `Filters` as query params to `GET /clips` and let the backend return the matched set. Keep the
   pure function for client-side refinement, or drop it once the endpoint owns the logic.
2. **Fetch clips in Server Components.** `getAllClips` / `getClipById` become `async` and call the
   API. `clips/[clipId]/page.tsx` is already an async Server Component, so it only needs `await`.
   `generateStaticParams` should switch to `dynamicParams` or be removed for a live catalogue.
3. **Real thumbnails.** `getThumbUrl` returns a `picsum.photos` placeholder. Replace it with the
   signed URL the backend supplies on the `Clip` payload, and add the host to
   `next.config.ts → images.remoteDomains` if you migrate to `next/image`.
4. **Real assistant.** `answerForClip` / `answerForResults` are deterministic stand-ins that read
   the clip set. Point them at `POST /assistant` and make the store actions in
   `src/lib/store.ts` (`askInResults`, `askAboutClip`) async, pushing the user message immediately
   and the agent reply on resolve.
5. **Real pipeline.** `submitAnnotationJob` appends to local state and `usePipelineSimulation`
   fakes progress on a 1400 ms interval. Replace the submit with `POST /jobs` (multipart upload)
   and swap the interval for a WebSocket or SSE subscription; the reducer in `advancePipeline`
   already models the concurrency rule (max 2 concurrent jobs, promote the next pending).
6. **Keywords.** `detectKeywords` runs a local regex dictionary from `src/data/keywords.ts`. If the
   backend does NLQ parsing, call it and map the response onto the existing `DetectedKeyword`
   shape — the UI needs no change.

The `src/types` definitions already describe the payloads a backend should return, so they can be
generated from the OpenAPI schema and dropped in wholesale.

## Notes on behaviour

- **Pipeline simulation** runs only while `/pipeline` is mounted; the interval is cleaned up on
  unmount. It advances processing jobs, completes them at 100%, and promotes a pending job when a
  slot frees up — never more than `MAX_CONCURRENT_JOBS` (2) at once.
- **Accessibility**: semantic landmarks, real `<button>` elements for everything clickable, labels
  bound to inputs, `role="dialog"` modals with focus trapping, Escape-to-close and focus restore,
  and a visible focus ring.
- **Motion**: 150–200 ms transitions on hover states, width-animated progress bars, and a global
  `prefers-reduced-motion` override.

## Design reference

`design-reference/CCTV AI Prototype.dc.html` is the visual source of truth. It is a reference, not
code to copy — its inline styles were translated into Tailwind utilities and theme tokens.
