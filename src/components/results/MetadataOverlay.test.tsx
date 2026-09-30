import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MetadataOverlay } from "@/components/results/MetadataOverlay";
import type { Clip } from "@/types";

const clip: Clip = {
  id: "evt-1",
  camera: "G328",
  code: "G328",
  ts: "2:49",
  date: "",
  order: 0,
  confidence: 82,
  tags: ["Vehicle"],
  objects: "Vehicle",
  action: "A white van stops at the gate",
  eventName: "Vehicle stops at gate",
  scene: "admin",
  description: "A white van pulls up to the north gate and waits.",
};

const panel = () => screen.getByRole("region", { name: "Chunk metadata" });
const labels = () =>
  [...panel().querySelectorAll("[data-meta-label]")].map((node) => node.textContent);

describe("MetadataOverlay", () => {
  it("floats as a full-height column against the video's right edge", () => {
    render(<MetadataOverlay clip={clip} currentTime={170} onClose={() => {}} />);

    expect(panel()).toHaveClass("glass-overlay", "top-3", "right-3", "bottom-3");
    expect(panel()).not.toHaveClass("left-3");
  });

  it("reads top to bottom: what happened, where, when, then the details", () => {
    render(<MetadataOverlay clip={clip} currentTime={170} onClose={() => {}} />);

    expect(labels()).toEqual([
      "EVENT",
      "CONFIDENCE",
      "CAMERA",
      "SCENE",
      "TIMESTAMP",
      "PLAYHEAD",
      "OBJECTS DETECTED",
      "DESCRIPTION",
    ]);
    expect(within(panel()).getByText("Vehicle stops at gate")).toBeInTheDocument();
    expect(within(panel()).getByText("2:50")).toBeInTheDocument();
  });

  it("leaves out the rows a moment has no data for", () => {
    render(
      <MetadataOverlay
        clip={{ ...clip, scene: undefined, description: undefined, ts: "" }}
        currentTime={0}
        onClose={() => {}}
      />,
    );

    expect(labels()).not.toContain("SCENE");
    expect(labels()).not.toContain("DESCRIPTION");
    expect(labels()).not.toContain("TIMESTAMP");
  });

  it("shows confidence as a readable number with a meter, not as coloured text", () => {
    render(<MetadataOverlay clip={clip} currentTime={0} onClose={() => {}} />);

    const meter = within(panel()).getByRole("meter", { name: "Confidence" });
    expect(meter).toHaveAttribute("aria-valuenow", "82");
    expect(within(panel()).getByText("82%")).not.toHaveAttribute("style");
  });

  it("keeps every text in the full-contrast ink, since the frame shows through", () => {
    render(<MetadataOverlay clip={clip} currentTime={0} onClose={() => {}} />);

    expect(panel().innerHTML).not.toMatch(/text-ink-[23]/);
  });

  it("closes from its close button", () => {
    const onClose = vi.fn();
    render(<MetadataOverlay clip={clip} currentTime={0} onClose={onClose} />);

    screen.getByRole("button", { name: "Close metadata" }).click();

    expect(onClose).toHaveBeenCalledOnce();
  });
});
