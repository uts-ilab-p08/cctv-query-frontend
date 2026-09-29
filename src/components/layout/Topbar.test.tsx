import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "@/components/layout/Topbar";
import { getCameras } from "@/lib/api/endpoints";

vi.mock("@/lib/api/endpoints", () => ({ getCameras: vi.fn() }));

const cameras = [
  { code: "G328", eventCount: 12, scene: "admin" },
  { code: "G420", eventCount: 3, scene: "school" },
];

describe("Topbar", () => {
  beforeEach(() => {
    vi.mocked(getCameras).mockReset();
  });

  it("counts the cameras the backend has indexed", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<Topbar />);

    expect(
      await screen.findByRole("button", { name: "Archived footage · 2 cameras indexed" }),
    ).toBeInTheDocument();
  });

  it("shows no camera count until the backend answers, and none if it fails", async () => {
    vi.mocked(getCameras).mockImplementation(async () => {
      throw new Error("offline");
    });
    render(<Topbar />);

    const button = screen.getByRole("button", { name: /Archived footage/ });
    expect(button).toHaveTextContent(/^Archived footage$/);
    await vi.waitFor(() => expect(getCameras).toHaveBeenCalled());
    expect(button).toHaveTextContent(/^Archived footage$/);
  });
});
