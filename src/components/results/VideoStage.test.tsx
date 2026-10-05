import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VideoStage } from "@/components/results/VideoStage";
import type { Clip } from "@/types";

const clip: Clip = {
  id: "evt-1",
  camera: "G328",
  code: "G328",
  ts: "2:30",
  date: "",
  order: 0,
  confidence: 90,
  tags: [],
  objects: "",
  action: "Person exits",
  scene: "admin",
  videoUrl: "https://cdn.test/a.mp4",
  startSeconds: 150,
  captureStartLocal: "2018-03-05T13:15:00",
};

function renderStage(overrides: Partial<Clip> = {}, currentTime = 162) {
  const noop = vi.fn();
  return render(
    <VideoStage
      clip={{ ...clip, ...overrides }}
      currentTime={currentTime}
      playing={false}
      muted
      metaOpen={false}
      ticks={[]}
      duration={600}
      cueKey="k"
      seekRequest={null}
      onTimeUpdate={noop}
      onDuration={noop}
      onStop={noop}
      onTogglePlay={noop}
      onToggleMute={noop}
      onToggleMeta={noop}
      onSeek={noop}
    />,
  );
}

describe("VideoStage — camera overlay", () => {
  it("names the camera top left and its scene top right", () => {
    renderStage();

    const camera = screen.getByRole("group", { name: "Camera on the player" });
    expect(within(camera).getByText("CAM G328")).toBeInTheDocument();
    expect(screen.getByLabelText("Scene")).toHaveTextContent("admin");
  });

  it("shows the camera's own date and time at the playhead, bottom centre", () => {
    renderStage({}, 162);

    const clock = screen.getByLabelText("Camera time");
    expect(clock).toHaveTextContent("2018-03-05");
    expect(clock).toHaveTextContent("13:17:42");
    expect(clock.querySelector("time")).toHaveAttribute("datetime", "2018-03-05T13:17:42");
  });

  it("follows the playhead as the video plays", () => {
    const { rerender } = renderStage({}, 162);
    const noop = vi.fn();
    rerender(
      <VideoStage
        clip={clip}
        currentTime={200}
        playing
        muted
        metaOpen={false}
        ticks={[]}
        duration={600}
        cueKey="k"
        seekRequest={null}
        onTimeUpdate={noop}
        onDuration={noop}
        onStop={noop}
        onTogglePlay={noop}
        onToggleMute={noop}
        onToggleMeta={noop}
        onSeek={noop}
      />,
    );

    expect(screen.getByLabelText("Camera time")).toHaveTextContent("13:18:20");
  });

  it("hides the clock, rather than showing 00:00:00, when the start time is unknown", () => {
    renderStage({ captureStartLocal: undefined });

    expect(screen.queryByLabelText("Camera time")).not.toBeInTheDocument();
    expect(screen.queryByText(/00:00:00/)).not.toBeInTheDocument();
  });

  it("no longer repeats the elapsed time top right: the player bar already shows it", () => {
    const { container } = renderStage({}, 162);

    const stage = container.querySelector("[data-camera-overlay]") as HTMLElement;
    expect(stage).not.toBeNull();
    expect(within(stage).queryByText("2:42")).not.toBeInTheDocument();
  });

  it("sets every label on an 80% black plate, so it reads over any frame", () => {
    renderStage();

    const camera = within(screen.getByRole("group", { name: "Camera on the player" })).getByText(
      "CAM G328",
    );
    for (const label of [
      camera,
      screen.getByLabelText("Scene"),
      screen.getByLabelText("Camera time"),
    ]) {
      expect(label).toHaveClass("bg-black/80");
    }
  });

  it("draws the CCTV frame and scanlines as decoration only", () => {
    const { container } = renderStage();

    const frame = container.querySelector("[data-cctv-frame]");
    expect(frame).toHaveAttribute("aria-hidden", "true");
    expect(frame).toHaveClass("pointer-events-none");
  });
});
