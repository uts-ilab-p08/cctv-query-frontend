import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CamerasScreen } from "@/components/cameras/CamerasScreen";
import { getCameras } from "@/lib/api/endpoints";

vi.mock("@/lib/api/endpoints", () => ({ getCameras: vi.fn() }));

const cameras = [
  { code: "G328", eventCount: 12, scene: "admin" },
  { code: "G329", eventCount: 1, scene: "admin" },
  { code: "G420", eventCount: 3, scene: "school" },
];

describe("CamerasScreen", () => {
  beforeEach(() => {
    vi.mocked(getCameras).mockReset();
  });

  it("is a page, not a dialog, titled Indexed Cameras", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<CamerasScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Indexed Cameras" })).toBeInTheDocument();
    expect(await screen.findByText("G328")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("groups the cameras by scene, each with its event count", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<CamerasScreen />);

    const admin = await screen.findByRole("region", { name: "admin" });
    expect(within(admin).getByText("G328")).toBeInTheDocument();
    expect(within(admin).getByText("12 events")).toBeInTheDocument();
    expect(within(admin).getByText("1 event")).toBeInTheDocument();
    const school = screen.getByRole("region", { name: "school" });
    expect(within(school).getByText("G420")).toBeInTheDocument();
    expect(within(school).queryByText("G328")).not.toBeInTheDocument();
  });

  it("sums up cameras, scenes and indexed events", async () => {
    vi.mocked(getCameras).mockResolvedValue(cameras);
    render(<CamerasScreen />);

    const summary = await screen.findByRole("list", { name: "Directory summary" });
    expect(within(summary).getByText("CAMERAS").nextSibling).toHaveTextContent("3");
    expect(within(summary).getByText("SCENES").nextSibling).toHaveTextContent("2");
    expect(within(summary).getByText("INDEXED EVENTS").nextSibling).toHaveTextContent("16");
  });

  it("lists cameras flat when the backend gives no scene", async () => {
    vi.mocked(getCameras).mockResolvedValue([{ code: "G328", eventCount: 2 }]);
    render(<CamerasScreen />);

    expect(await screen.findByText("G328")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "other" })).not.toBeInTheDocument();
  });

  it("says so when nothing is indexed yet", async () => {
    vi.mocked(getCameras).mockResolvedValue([]);
    render(<CamerasScreen />);

    expect(await screen.findByText("No cameras indexed yet")).toBeInTheDocument();
  });

  it("reports a failed load and retries on demand", async () => {
    const user = userEvent.setup();
    vi.mocked(getCameras).mockRejectedValueOnce(new Error("offline"));
    vi.mocked(getCameras).mockResolvedValueOnce(cameras);
    render(<CamerasScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("G328")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
