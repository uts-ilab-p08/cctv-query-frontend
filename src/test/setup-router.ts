import { vi } from "vitest";

export const pushMock = vi.fn();
export const backMock = vi.fn();

/** Minimal App Router stand-in for component tests. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  notFound: vi.fn(),
}));
