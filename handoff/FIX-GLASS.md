# Fix: glass, glows and surface detail are missing in the ported app

## Root cause
`tokens.css` previously exposed translucent/gradient surfaces as **colour** tokens
(`--color-panel: var(--panel)`). Tailwind colour utilities compile to `background-color`, and
`background-color` cannot hold a `linear-gradient` — so every `bg-panel` resolved to nothing:
no fill, no blur, no inset highlight. Ambient glows were also never mounted, so the remaining
translucency had nothing to refract.

## Apply this patch

1. Replace `app/globals.css` with the **new** `handoff/tokens.css`.
2. Add `handoff/components/AmbientBackdrop.tsx` and mount it as the first child of the app shell;
   the shell root must be `relative overflow-hidden min-h-dvh`.
3. Swap every surface class:

| Old (broken) | New |
|---|---|
| `bg-panel border border-hairline shadow-glass` | `glass-card` (fill + blur + border + shadow + sheen, all in one) |
| `bg-panel-soft …` | `glass-card-soft` |
| `bg-panel-strong glass-overlay border …` | `glass-panel` (assistant panel, modals, token dropdown) |
| `bg-sidebar glass` | `surface-sidebar` |
| `bg-topbar glass` | `surface-topbar` |
| `bg-action` | `surface-action` |
| `bg-brand-grad` | `surface-brand` |

   `bg-panel-solid`, `text-ink*`, `border-hairline*`, `text-accent*`, `bg-accent-soft`,
   `text-match/review/flag`, `bg-track`, `rounded-chip/card/field` stay as they are — those are flat values.

4. Do **not** add a second gradient sheen, a border-gradient, or an extra shadow on top of
   `glass-card`: the utility already carries the one `inset 0 1px 0` highlight the brand allows.
5. Keep 3–5 glass layers per screen. Scroll containers must not clip the floating panel
   (`overflow-hidden` on an ancestor kills both the blur backdrop and the fixed assistant).

## Verify (do all four, in dark and light)
- `getComputedStyle(card).backgroundImage` contains `linear-gradient`, and `backdropFilter` is `blur(18px)`.
- `getComputedStyle(card).boxShadow` contains an `inset` entry.
- The three `.glow` nodes exist and are painted behind content (glass tints slightly violet near them).
- `data-theme="light"`: cards read as white frosted on `#e9e9ec`, primary buttons are ink-black pills.

## Common pitfalls that also hide the effect
- A parent with `backdrop-filter` creates a containing block: nested `fixed` panels get trapped. The
  assistant panel must not be inside a blurred ancestor.
- `overflow: hidden` + `border-radius` on a wrapper flattens child blur in Safari — blur the child, not the wrapper.
- Tailwind's `backdrop-blur-*` utilities are fine, but do not combine them with `glass-*` (double blur).
- If a surface still looks flat, it is almost always a leftover `bg-*` colour class overriding the utility —
  `glass-card` must be the only background class on that element.
