# Handoff prompt — CCTV AI Assistant (design → Next.js 15)

Paste this into your coding agent inside the existing repo.

---

You are working in an existing **Next.js 15 (App Router) + React 19 + TypeScript (strict)** project with
**Tailwind CSS v4** (tokens via `@theme`), **Zustand**, **lucide-react**, `cn()` from clsx + tailwind-merge,
**Vitest + React Testing Library**, ESLint/Prettier/Husky.

Port the finished design of the "CCTV AI Assistant" prototype into this stack. The design is fully specified in
this handoff folder — follow it literally; do not invent new visual decisions.

Files provided:
- `SPEC.md` — screens, components, behaviour, glassmorphism + icon rules, acceptance criteria
- `tokens.css` — the complete dual-theme token layer, ready for `app/globals.css`
- `store/useAppStore.ts` — Zustand store (theme, view, query, filters, chat, pipeline)
- `lib/entities.ts` — inline query-token detection (the core interaction) + filter mappings
- `components/BrandMark.tsx` — the new logo as a typed component
- `components/QueryField.tsx` — the tokenized search field (overlay + textarea + dropdown)
- `brand/logo-mark-violet.svg`, `brand/logo-mark-currentcolor.svg` — source assets

Rules for the port:
1. **Tokens first.** Copy `tokens.css` into `app/globals.css`. Never hardcode a hex in a component —
   use the Tailwind token classes it generates (`bg-panel`, `text-ink-2`, `border-hairline`, `shadow-glass`…).
2. **Theme** is `data-theme="dark" | "light"` on `<html>`; dark is the default and must be the server-rendered
   value (no flash). Persist the choice in `localStorage` under `cctv-ai:theme` and read it in a
   `beforeInteractive` inline script. The switch lives in the top bar as a 2-option segmented pill.
3. **Server vs client.** Layout, sidebar shell and static sections are server components; anything with state
   (`QueryField`, results view, chat panel, pipeline queue) is `"use client"` and reads the Zustand store.
4. **Icons:** lucide-react only, `strokeWidth={2}`, size 17 in 32px nav circles / 19 in 44px action circles.
   Map: Search → `Search`, Saved Queries → `Bookmark`, Reports → `AlignLeft`, Annotation Pipeline → `Layers`,
   Settings → `Settings`, chat send → `ArrowRight`, collapse → `ChevronRight`, filters → `SlidersHorizontal`.
   The **logo is not a lucide icon** — use `BrandMark`.
5. **No `any`**, no `@ts-ignore`. Every component gets an explicit props interface. `cn()` for conditional classes.
6. **Tests (Vitest + RTL)** are required for: `findEntities` (each entity kind + overlap resolution),
   `QueryField` (typing underlines a term, clicking it opens the menu, choosing an option rewrites the query
   text and sets the matching filter), theme switch (toggles `data-theme` and persists), and chat visibility
   (hidden on results load, opens via "Ask more").
7. Do not add libraries beyond the stack above. No CSS-in-JS, no styled-components, no icon packs.

Work in this order: tokens → store → BrandMark + AppShell (sidebar + top bar) → QueryField + entities →
Home/Search → Results (field + Query AI Overview + grid/timeline) → Clip Detail → floating Assistant panel →
Saved / Reports / Pipeline → tests. Run `lint`, `typecheck` and `test` before you report done.
