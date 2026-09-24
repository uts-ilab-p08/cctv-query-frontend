import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LandingPage } from "@/components/landing/LandingPage";
import { LoginScreen } from "@/components/login/LoginScreen";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: {} }) }));

/**
 * `video-*` tokens stay dark in every theme (footage always sits on black). Used as a
 * page surface they put theme text (dark in light mode) on a dark ground — so public
 * pages must build their surfaces from theme-aware tokens instead.
 */
const VIDEO_SURFACE = /\bbg-video-(stage|bar|frame)\b/;
/** Utilities with no matching theme token — they compile to nothing, leaving no fill. */
const UNDEFINED_FILL = /\bbg-panel(-soft)?\b(?!-)/;

describe.each([
  ["LandingPage", LandingPage],
  ["LoginScreen", LoginScreen],
])("%s surfaces", (_name, Page) => {
  it("never use a video surface as a page background", () => {
    const { container } = render(<Page />);
    const offenders = [...container.querySelectorAll<HTMLElement>("[class]")].filter((el) =>
      VIDEO_SURFACE.test(el.className),
    );
    expect(offenders.map((el) => el.className)).toEqual([]);
  });

  it("only use fill utilities that exist", () => {
    const { container } = render(<Page />);
    const offenders = [...container.querySelectorAll<HTMLElement>("[class]")].filter((el) =>
      UNDEFINED_FILL.test(el.className),
    );
    expect(offenders.map((el) => el.className)).toEqual([]);
  });
});
