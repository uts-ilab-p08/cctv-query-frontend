"use client";

import { DEFAULT_PALETTE, PALETTES, usePalette } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";
import { APP_COMMIT, APP_VERSION, releaseUrl, versionLabel } from "@/lib/version";
import { useAppStore } from "@/store/useAppStore";

/** The palettes as Settings lists them: the default first, the rest in their usual order.
 *  Derived from DEFAULT_PALETTE, so changing the default updates the list too. */
const PALETTE_OPTIONS = [
  ...PALETTES.filter((option) => option.id === DEFAULT_PALETTE),
  ...PALETTES.filter((option) => option.id !== DEFAULT_PALETTE),
];

const SECTION = "rounded-card glass-card-flat mb-4 p-5";
const HEADING = "text-ink mb-1 text-[15px] font-semibold";
const HINT = "text-ink-2 mb-3.5 text-xs";

/** Settings as its own page (was a modal): appearance and the running version. Search is
 *  natural language only. */
export function SettingsScreen() {
  const theme = useAppStore((state) => state.theme);
  const { palette, setPalette } = usePalette();

  const paletteApplies = theme === "dark";

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Settings</h1>
      <p className="text-ink-2 mb-7 text-sm">How the app looks, and which release it is.</p>

      <section aria-labelledby="settings-appearance" className={SECTION}>
        <h2 id="settings-appearance" className={HEADING}>
          Appearance
        </h2>
        <p className={HINT}>Accent palette used while the theme is dark.</p>

        {paletteApplies ? (
          <div role="radiogroup" aria-label="Palette" className="grid gap-2.5 sm:grid-cols-3">
            {PALETTE_OPTIONS.map((option) => {
              const active = palette === option.id;
              const isDefault = option.id === DEFAULT_PALETTE;
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
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{option.label}</span>
                    {isDefault ? (
                      <span className="border-hairline text-ink-2 rounded-full border px-1.5 py-px font-mono text-[10px] tracking-[0.6px]">
                        Default
                      </span>
                    ) : null}
                  </span>
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

      <section aria-labelledby="settings-about" className={SECTION}>
        <h2 id="settings-about" className={HEADING}>
          About
        </h2>
        <p className={HINT}>The release this app is running.</p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-2">Version</dt>
          <dd>
            <a
              href={releaseUrl(APP_VERSION)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono"
            >
              {versionLabel(APP_VERSION)}
            </a>
          </dd>
          <dt className="text-ink-2">Build</dt>
          <dd className="text-ink font-mono">{APP_COMMIT ?? "—"}</dd>
        </dl>
      </section>
    </div>
  );
}
