"use client";

import { Modal } from "@/components/ui/Modal";
import { PALETTES, usePalette } from "@/components/theme/ThemeProvider";
import { precincts } from "@/data/precincts";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { SearchMode } from "@/types";

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

export function SettingsModal() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const searchMode = useAppStore((state) => state.searchMode);
  const setSearchMode = useAppStore((state) => state.setSearchMode);
  const selectedPrecinct = useAppStore((state) => state.precinct);
  const setPrecinct = useAppStore((state) => state.setPrecinct);
  const theme = useAppStore((state) => state.theme);
  const { palette, setPalette } = usePalette();

  const close = closeSettings;
  const paletteApplies = theme === "dark";

  return (
    <Modal
      open={settingsOpen}
      onClose={close}
      title="Search settings"
      description="Choose how you search the camera network."
      width={440}
    >
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

      <div className="border-hairline mt-[22px] border-t pt-[18px]">
        <p className="text-ink-2 mb-2.5 text-xs">
          Precinct — which camera network you&apos;re querying.
        </p>
        <div role="radiogroup" aria-label="Precinct" className="flex flex-wrap gap-2">
          {precincts.map((precinct) => {
            const active = precinct === selectedPrecinct;
            return (
              <button
                key={precinct}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPrecinct(precinct)}
                className={cn(
                  "cursor-pointer rounded-md border px-3.5 py-2 font-sans text-[13px] transition-colors duration-150",
                  active
                    ? "border-accent-line bg-accent-soft text-accent"
                    : "text-ink-2 hover:text-ink glass-card-flat",
                )}
              >
                {precinct}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-hairline mt-[22px] border-t pt-[18px]">
        <p className="text-ink-2 mb-2.5 text-xs">
          Appearance — accent palette used while the theme is dark.
        </p>

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
      </div>
    </Modal>
  );
}
