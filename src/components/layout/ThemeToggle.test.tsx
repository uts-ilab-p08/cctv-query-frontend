import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DEFAULT_THEME, THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme";
import { useAppStore } from "@/store/useAppStore";
import { resetStore } from "@/test/utils";

describe("ThemeToggle", () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
  });

  it("marks dark as the active segment by default", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
  });

  it("flips data-theme on the document when light is chosen", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Light" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(useAppStore.getState().theme).toBe("light");
  });

  it("persists the choice under the documented key", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Light" }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("flips back to dark", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Light" }));
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("adopts the stored theme on mount", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    });
  });

  it("ignores a corrupt stored value and stays on the default", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    render(<ThemeToggle />);

    await vi.waitFor(() => {
      expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    });
  });
});

describe("ThemeToggle on small screens", () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
  });

  it("swaps the pill for one icon button, hidden from sm up, that switches theme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toLight = screen.getByRole("button", { name: "Switch to light theme" });
    expect(toLight).toHaveClass("sm:hidden");
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toHaveClass("max-sm:hidden");

    await user.click(toLight);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("themeInitScript", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
  });

  it("stamps the stored theme before hydration", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    new Function(themeInitScript)();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("leaves the server-rendered dark default in place when nothing is stored", () => {
    new Function(themeInitScript)();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("ignores an unrecognised stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon");

    new Function(themeInitScript)();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
