"use client";

import { useEffect } from "react";

import { cn } from "@/lib/cn";
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from "@/lib/theme";
import { persistTheme, useAppStore } from "@/store/useAppStore";

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/**
 * The 2-option segmented pill in the top bar. The inline `beforeInteractive`
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

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="border-hairline bg-panel glass rounded-pill flex items-center gap-0.5 border p-0.5"
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
              "rounded-pill cursor-pointer px-3 py-1 text-xs font-medium transition-colors duration-150",
              active ? "bg-action shadow-action" : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
