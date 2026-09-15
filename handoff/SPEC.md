# CCTV AI Assistant — design spec for the Next.js port

Everything below is the _current, approved_ design. Token names refer to `tokens.css`.

## 1. Shell

- **Layout**: fixed 232px sidebar (`bg-sidebar`, `glass`) + scrollable main column.
- **Ambient light**: 3 absolutely-positioned radial glows behind everything
  (`--glow-1` top-left 520px, `--glow-2` right 560px, `--glow-3` bottom 600px), `pointer-events-none`.
- **Sidebar**: `BrandLockup` at the top (mark in `text-brand`), then nav rows — a **pill row**
  (`rounded-pill`, `pl-1.5 pr-3.5 py-1.5`, gap 11px) containing a **32px circle** with the lucide icon and the
  label _outside_ the circle. Resting: circle `bg-panel` + `border-hairline-strong`, label `text-ink-2`.
  Active: row `bg-[var(--accent-soft)]`/ink pill in light, circle `bg-action` + `shadow-action`, label full ink.
  Footer: precinct + investigator in `font-mono text-[11px] text-ink-3`.
- **Top bar**: 64px, sticky, `bg-topbar glass`, `border-b border-hairline`, **z-25** (must sit above the
  query field's z-20 stacking context). Left: back button when not on Home + breadcrumb. Right: "Archived
  footage · 8 cameras indexed" (mono, accent dot) + the **Dark/Light segmented pill**.

## 2. Home / Search

Centred column, max-width 680px: title "Query your camera network" (44px/700), mode hint, a link to
settings, then `<QueryField variant="hero" />`, then "RECENT QUERIES" (mono label) with 3 glass rows.
No filter chips on this screen.

## 3. Query field behaviour (the signature interaction)

- Overlay renders the query; the textarea underneath is transparent and owns the caret.
  **The overlay must be above the textarea** or token clicks never land.
- Detected terms: `font-bold text-token-ink border-b-2 border-dashed border-token-line` — no colour coding.
  Surrounding text is `text-ink-2`, so the bold tokens read as the emphasis.
- Click a term → dropdown anchored under it (`rounded-chip bg-panel-solid`, mono caption = entity title,
  current value highlighted with `bg-accent-soft text-accent`). Choosing an option rewrites that slice of the
  query, restores the caret after the new word, and applies the mapped filter (tag / camera / confidence).
- Field shape: `rounded-field` (34px) to match the circular buttons; actions live **inside** the field
  (44px circles on hero, 38px on compact): Search (`bg-action`) and, in classic mode, Filters.
- Enter submits and never inserts a newline.

## 4. Results

1. `<QueryField variant="compact" />` at the top (same store state, stays editable).
2. **Query AI Overview**: 24px `bg-brand-grad` rounded-lg badge, heading "Query AI Overview", and an
   **Ask more →** pill that opens the assistant. Below it the plain-language summary, e.g.
   _"Found 16 indexed events matching "…" across 8 cameras. Top match: vehicle arrival on G328 at 13:58:02 (96% confidence)."_
3. Result count + active filter chips (removable) + Grid/Timeline switch.
4. Grid of clip cards (`min 260px`, thumbnail desaturated `grayscale(.55) contrast(1.05) brightness(.85)`,
   camera code badge, confidence badge in `--match/--review/--flag`) or the timeline list with a rail.

## 5. Clip Detail

16:9 player card with camera/timestamp overlays and a `bg-brand-grad` progress fill, a 2-column metadata
grid with mono labels (TIMESTAMP, CAMERA, PERSPECTIVE, ACTION TYPE, OBJECTS DETECTED, CONFIDENCE), and a
horizontal "RELATED CLIPS" strip.

## 6. Query Assistant panel

- **Floating overlay**, not a column: `fixed right-0 top-20 bottom-4 w-[380px] z-30`, `bg-panel-strong`,
  `glass-overlay`, left/top/bottom hairline, `rounded-l-card` (18px left corners only), `shadow-glass-lg`.
- Hidden on load in Results and Detail; opens from **Ask more →** (Results) or the floating
  "Query Assistant" pill (Detail). Header has `+ New` and a `ChevronRight` collapse button.
- Content area reserves space only while open (main content gets `pr-[412px]`, otherwise `pr-8`).
- Empty state = 4 suggested questions as left-aligned glass buttons; user bubbles `bg-[var(--chat-user-bg)]`
  right-aligned, agent bubbles on `--panel-solid`, with a "View related clip →" action when an answer
  references one.

## 7. Saved / Reports / Annotation Pipeline

Same glass list/stat-card vocabulary. Pipeline: stat cards, a submit card (dashed drop zone, camera select,
Full recording / Trimmed clip, model chips, Local / Remote target + endpoint input, full-width action), and a
live queue where `processing` rows animate their progress bar (`bg-brand-grad`) every 1.4s and promote the
next `pending` job when fewer than 2 are running.

## 8. Glassmorphism rules (non-negotiable)

| Rule      | Value                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------- |
| Fill      | dark: white 3.5–7% · light: white 68–82%                                                            |
| Blur      | 18px fields/bars · 28px overlay panels & modals                                                     |
| Edge      | 1px hairline + **one** top inset highlight (`inset 0 1px 0 rgb(255 255 255 / .12)`) — no full sheen |
| Elevation | one soft shadow per layer; `shadow-glass-lg` only for floating panels/menus                         |
| Text      | body copy only on `--panel-strong` / `--panel-solid`; 4.5:1 contrast (3:1 display)                  |
| Budget    | 3–5 glass layers per screen; every glass node gets `transform: translateZ(0)`                       |
| Radius    | 12 chips/menus · 18 cards/panels · 34 query field & circular actions                                |

## 9. Icons & type

- lucide-react, `strokeWidth={2}`, round caps, always inside a circle (32 nav / 38–44 actions);
  hit targets ≥ 44px. Logo is `BrandMark`, never a lucide icon.
- Archivo 400/500/600/700 for language; IBM Plex Mono 400/500 for machine data (camera codes, timestamps,
  confidence, model names, mono caption labels at 10–11px / +1.6px tracking).

## 10. Acceptance criteria

- Dark is the default theme, server-rendered, no flash; switch persists and only flips `data-theme`.
- No component contains a hex colour or `px` shadow literal — tokens only.
- Typing "anyone who entered the parking lot after 14:00 yesterday with high confidence" underlines 5 terms;
  each opens a menu and each selection updates both the query text and the filter state.
- Assistant panel is absent from the DOM flow (fixed) and closed by default on Results/Detail.
- `pnpm lint && pnpm typecheck && pnpm test` clean; no `any`.
