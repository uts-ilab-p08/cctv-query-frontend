"use client";

import { PALETTES, usePalette } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { SearchMode } from "@/types";

const SECTION = "rounded-card glass-card-flat mb-4 p-5";
const HEADING = "text-ink mb-1 text-[15px] font-semibold";
const HINT = "text-ink-2 mb-3.5 text-xs";

interface ModeOption {
  value: SearchMode;
  title: string;
  description: string;
}

const modeOptions: ModeOption[] = [
  {
    value: "nlq",
    title: "Natural language query",
    description:
      "Type freely — the assistant detects keywords and surfaces filters inline as you type.",
  },
  {
    value: "classic",
    title: "Classic filters",
    description:
      "Use the Filters button to set camera, date range, confidence and event type manually.",
  },
];

/** Settings as its own page (was a modal): search mode and appearance. */
export function SettingsScreen() {
  const searchMode = useAppStore((state) => state.searchMode);
  const setSearchMode = useAppStore((state) => state.setSearchMode);
  const theme = useAppStore((state) => state.theme);
  const { palette, setPalette } = usePalette();

  const paletteApplies = theme === "dark";

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Settings</h1>
      <p className="text-ink-2 mb-7 text-sm">
        How you search the camera network, and how it looks.
      </p>

      <section aria-labelledby="settings-mode" className={SECTION}>
        <h2 id="settings-mode" className={HEADING}>
          Search mode
        </h2>
        <p className={HINT}>Choose how you search the camera network.</p>
        <div role="radiogroup" aria-label="Search mode" className="flex flex-col gap-2.5">
          {modeOptions.map((option) => {
            const active = searchMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSearchMode(option.value)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 text-left transition-colors duration-150",
                  active ? "border-accent-line bg-accent-soft" : "border-hairline bg-transparent",
                )}
              >
                <span
                  aria-hidden
                  className="border-accent-line mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                >
                  {active ? <span className="bg-accent size-2 rounded-full" /> : null}
                </span>
                <span>
                  <span className="mb-[3px] block text-sm font-semibold">{option.title}</span>
                  <span className="text-ink-2 block text-xs">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="settings-appearance" className={SECTION}>
        <h2 id="settings-appearance" className={HEADING}>
          Appearance
        </h2>
        <p className={HINT}>Accent palette used while the theme is dark.</p>

        {paletteApplies ? (
          <div role="radiogroup" aria-label="Palette" className="grid gap-2.5 sm:grid-cols-3">
            {PALETTES.map((option) => {
              const active = palette === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPalette(option.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border p-3 text-left transition-colors duration-150",
                    active ? "border-accent-line bg-accent-soft" : "border-hairline bg-transparent",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {option.swatch.map((color) => (
                      <span
                        key={color}
                        aria-hidden
                        className="border-hairline h-4 w-4 rounded-full border"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-ink-2 text-xs leading-relaxed">{option.hint}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-ink-3 border-hairline rounded-md border px-3.5 py-3 text-xs leading-relaxed">
            Color palettes are available in dark mode. Switch to dark from the theme toggle in the
            top bar to choose one.
          </p>
        )}
      </section>
    </div>
  );
}
