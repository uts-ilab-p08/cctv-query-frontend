import { describe, expect, it } from "vitest";

import type { AssistantMoment, AssistantSuggestionsRequest } from "../types";
import { suggestQuestionsFor } from "./assistant";

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

const mixed: AssistantMoment[] = [
  moment({ moment_id: "a", video_id: "vid-1", caption: "A red car enters the lot", score: 0.9 }),
  moment({ moment_id: "b", video_id: "vid-2", caption: "A person walks past", score: 0.7 }),
];

const request = (overrides: Partial<AssistantSuggestionsRequest>): AssistantSuggestionsRequest => ({
  query: "red car",
  scope: "results",
  focus_moment_id: null,
  moments: mixed,
  history: [],
  ...overrides,
});

describe("suggestQuestionsFor (simulated /assistant/suggestions)", () => {
  it("suggests at most three questions that fit the results", () => {
    const questions = suggestQuestionsFor(request({})).suggested_questions;
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it("only offers to narrow to vehicles when some, but not all, moments are vehicles", () => {
    const narrow = "Narrow this to vehicle events only";
    expect(suggestQuestionsFor(request({})).suggested_questions).toContain(narrow);
    const allVehicles = mixed.map((m) => ({ ...m, caption: "A van parks" }));
    expect(
      suggestQuestionsFor(request({ moments: allVehicles })).suggested_questions,
    ).not.toContain(narrow);
  });

  it("doesn't compare cameras when every moment comes from the same one", () => {
    const sameVideo = mixed.map((m) => ({ ...m, video_id: "vid-1" }));
    expect(suggestQuestionsFor(request({ moments: sameVideo })).suggested_questions).not.toContain(
      "Which camera has the most matches?",
    );
  });

  it("never repeats a question already asked in the thread", () => {
    const first = suggestQuestionsFor(request({})).suggested_questions[0];
    const next = suggestQuestionsFor(
      request({ history: [{ role: "user", text: first }] }),
    ).suggested_questions;
    expect(next).not.toContain(first);
  });

  it("asks about the focused moment, tailored to what it shows", () => {
    const vehicle = suggestQuestionsFor(
      request({ scope: "moment", focus_moment_id: "a" }),
    ).suggested_questions;
    const person = suggestQuestionsFor(
      request({ scope: "moment", focus_moment_id: "b" }),
    ).suggested_questions;
    expect(vehicle).toContain("Show this vehicle's full path across cameras");
    expect(person).not.toContain("Show this vehicle's full path across cameras");
  });

  it("has nothing to suggest without moments", () => {
    expect(suggestQuestionsFor(request({ moments: [] })).suggested_questions).toEqual([]);
  });
});
