import { describe, expect, it } from "vitest";

import { clipSuggestedQuestions, resultsSuggestedQuestions } from "@/data/suggestedQuestions";

import type { AssistantAskRequest, AssistantMoment } from "../types";
import { answerQuestion } from "./assistant";

const moment = (overrides: Partial<AssistantMoment>): AssistantMoment => ({
  moment_id: "m",
  video_id: "vid-1",
  start_seconds: 0,
  end_seconds: null,
  caption: "",
  score: 0.5,
  camera: null,
  ...overrides,
});

const moments: AssistantMoment[] = [
  moment({
    moment_id: "a",
    video_id: "vid-1",
    start_seconds: 12,
    caption: "A red car enters the lot",
    score: 0.91,
  }),
  moment({
    moment_id: "b",
    video_id: "vid-1",
    start_seconds: 40,
    caption: "A person walks past",
    score: 0.72,
  }),
  moment({
    moment_id: "c",
    video_id: "vid-2",
    start_seconds: 5,
    caption: "A van parks by the gate",
    score: 0.64,
  }),
];

const ask = (question: string, overrides: Partial<AssistantAskRequest> = {}) =>
  answerQuestion({
    query: "red car",
    question,
    scope: "results",
    focus_moment_id: null,
    moments,
    history: [],
    ...overrides,
  });

describe("answerQuestion (simulated /assistant/ask)", () => {
  it("cites the highest-scoring moment", () => {
    const response = ask("Show only the highest-confidence event");
    expect(response.citations).toEqual([{ moment_id: "a" }]);
    expect(response.answer).toMatch(/91%/);
  });

  it("narrows to the vehicle moments and cites each one", () => {
    const response = ask("Narrow this to vehicle events only");
    expect(response.citations.map((c) => c.moment_id)).toEqual(["a", "c"]);
    expect(response.answer).toMatch(/2 vehicle/);
  });

  it("groups by video while the RAG sends no camera", () => {
    const response = ask("Which camera has the most matches?");
    expect(response.answer).toMatch(/vid-1 has the most matches with 2 of 3/);
    expect(response.citations.map((c) => c.moment_id)).toEqual(["a", "b"]);
  });

  it("groups by camera once the camera is known", () => {
    const response = ask("Which camera has the most matches?", {
      moments: moments.map((m) => ({ ...m, camera: m.moment_id === "c" ? "G420" : "G328" })),
    });
    expect(response.answer).toMatch(/G328 has the most matches with 2 of 3/);
  });

  it("offers the scope's other suggestions as follow-ups", () => {
    const question = resultsSuggestedQuestions[0];
    const response = ask(question);
    expect(response.suggested_questions).not.toContain(question);
    expect(response.suggested_questions.length).toBeGreaterThan(0);
    expect(resultsSuggestedQuestions).toEqual(expect.arrayContaining(response.suggested_questions));
  });

  it("answers about the moment before the focused one", () => {
    const response = ask("Did anyone leave the building before this?", {
      scope: "moment",
      focus_moment_id: "b",
    });
    expect(response.citations).toEqual([{ moment_id: "a" }]);
    expect(clipSuggestedQuestions).toEqual(expect.arrayContaining(response.suggested_questions));
  });

  it("only cites moments it was given", () => {
    const response = ask("anything at all");
    const ids = new Set(moments.map((m) => m.moment_id));
    expect(response.citations.every((c) => ids.has(c.moment_id))).toBe(true);
  });
});
