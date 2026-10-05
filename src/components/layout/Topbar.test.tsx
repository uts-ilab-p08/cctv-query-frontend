import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetStore } from "@/test/utils";

import { Topbar } from "@/components/layout/Topbar";
import { getCameras } from "@/lib/api/endpoints";
import { getAllClips } from "@/lib/clips";
import { topMatches } from "@/lib/matches";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/lib/api/endpoints", () => ({ getCameras: vi.fn() }));

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => route.pathname,
}));

const cameras = [
  { code: "G328", eventCount: 12, scene: "admin" },
  { code: "G420", eventCount: 3, scene: "school" },
];

describe("Topbar", () => {
  beforeEach(() => {
    resetStore();
    route.pathname = "/dashboard";
    vi.mocked(getCameras).mockReset();
  });

  it("counts the cameras the backend has indexed", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<Topbar />);

    expect(
      await screen.findByRole("link", { name: "Archived footage · 2 cameras indexed" }),
    ).toBeInTheDocument();
  });

  it("links Home to the Indexed Cameras screen instead of opening a dialog", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<Topbar />);

    const link = await screen.findByRole("link", { name: /Archived footage/ });
    expect(link).toHaveAttribute("href", "/cameras");
  });

  it("shows no camera count until the backend answers, and none if it fails", async () => {
    vi.mocked(getCameras).mockImplementation(async () => {
      throw new Error("offline");
    });
    render(<Topbar />);

    const link = screen.getByRole("link", { name: /Archived footage/ });
    expect(link).toHaveTextContent(/^Archived footage$/);
    await vi.waitFor(() => expect(getCameras).toHaveBeenCalled());
    expect(link).toHaveTextContent(/^Archived footage$/);
  });

  it("on Results, counts only the cameras behind the top matches and opens their list", async () => {
    const user = userEvent.setup();
    vi.mocked(getCameras).mockResolvedValue(cameras);
    route.pathname = "/results";
    const clips = getAllClips();
    useAppStore.setState({ results: clips });
    const inSearch = new Set(topMatches(clips).map((clip) => clip.code)).size;
    render(<Topbar />);

    const button = screen.getByRole("button", {
      name: `${inSearch} ${inSearch === 1 ? "camera" : "cameras"} in this search`,
    });
    expect(screen.queryByRole("link", { name: /Archived footage/ })).not.toBeInTheDocument();

    await user.click(button);
    expect(useAppStore.getState().camerasOpen).toBe(true);
  });

  it("on Results without matches, falls back to the link to every indexed camera", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    route.pathname = "/results";
    render(<Topbar />);

    expect(
      await screen.findByRole("link", { name: "Archived footage · 2 cameras indexed" }),
    ).toHaveAttribute("href", "/cameras");
  });

  it("names the Indexed Cameras screen in the breadcrumb", () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    route.pathname = "/cameras";
    render(<Topbar />);

    expect(screen.getByRole("heading", { level: 1, name: "Indexed Cameras" })).toBeInTheDocument();
  });
});
