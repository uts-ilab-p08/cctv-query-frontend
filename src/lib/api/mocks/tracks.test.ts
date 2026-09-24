import { describe, expect, it } from "vitest";

import { simulateTracks } from "./tracks";

const moment = { video_id: "vid-1", start_seconds: 12, end_seconds: 20 };

describe("simulateTracks (stand-in for GET /videos/{id}/tracks)", () => {
  it("covers the moment with one track that stays inside the frame", () => {
    const response = simulateTracks({ ...moment, caption: "A red car enters the lot" });

    expect(response.simulated).toBe(true);
    expect(response.objects).toHaveLength(1);
    const { boxes } = response.objects[0];
    expect(boxes[0].t).toBe(12);
    expect(boxes.at(-1)?.t).toBe(20);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(response.frame_width);
      expect(box.y + box.h).toBeLessThanOrEqual(response.frame_height);
    }
  });

  it("labels the object from the caption and shapes the box to match", () => {
    const vehicle = simulateTracks({ ...moment, caption: "A van parks by the gate" }).objects[0];
    const person = simulateTracks({ ...moment, caption: "A person walks past" }).objects[0];

    expect(vehicle.label).toBe("vehicle");
    expect(person.label).toBe("person");
    // Vehicles read wide, people tall.
    expect(vehicle.boxes[0].w).toBeGreaterThan(vehicle.boxes[0].h);
    expect(person.boxes[0].h).toBeGreaterThan(person.boxes[0].w);
  });

  it("is deterministic for the same moment", () => {
    const a = simulateTracks({ ...moment, caption: "A person walks past" });
    const b = simulateTracks({ ...moment, caption: "A person walks past" });
    expect(a).toEqual(b);
  });
});
