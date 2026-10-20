"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/cn";
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from "@/lib/theme";
import { persistTheme, useAppStore } from "@/store/useAppStore";

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/**
 * The 2-option segmented pill in the top bar; on small screens, a single icon button
 * (moon in dark, sun in light) that switches to the other theme, to save space. The inline `beforeInteractive`
 * script has already stamped `data-theme`; this only re-syncs the store to the
 * stored value so the active segment matches what the user is actually seeing.
 */
export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const resolved = isTheme(stored) ? stored : DEFAULT_THEME;
    if (resolved !== theme) setTheme(resolved);
  }, [theme, setTheme]);

  const choose = (next: Theme) => () => {
    setTheme(next);
    persistTheme(next);
  };

  const other: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <>
      <button
        type="button"
        onClick={choose(other)}
        aria-label={`Switch to ${other} theme`}
        className="glass-card-flat text-ink-2 hover:text-ink flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 sm:hidden"
      >
        <Icon size={16} strokeWidth={2} aria-hidden />
      </button>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="glass-card-flat flex items-center gap-0.5 rounded-full p-0.5 max-sm:hidden"
      >
        {OPTIONS.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={choose(option.value)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
                active ? "surface-action shadow-action" : "text-ink-2 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
