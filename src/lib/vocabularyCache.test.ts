import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getVocabulary } from "@/lib/api/endpoints";
import {
  VOCABULARY_STORAGE_KEY,
  VOCABULARY_TTL_MS,
  clearVocabulary,
  loadVocabulary,
  readVocabulary,
  useVocabulary,
} from "@/lib/vocabularyCache";
import type { Vocabulary } from "@/types";

vi.mock("@/lib/api/endpoints", () => ({ getVocabulary: vi.fn() }));

const vocabulary: Vocabulary = {
  scenes: ["bus", "school"],
  synonyms: { campus: "school" },
  cameras: ["G328"],
  dates: ["2018-03-05"],
};
const newer: Vocabulary = { ...vocabulary, dates: ["2018-03-05", "2018-03-07"] };

const NOW = 1_800_000_000_000;

function store(savedAt: number, value: unknown = vocabulary): void {
  localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify({ savedAt, vocabulary: value }));
}

describe("vocabularyCache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getVocabulary).mockReset();
    vi.mocked(getVocabulary).mockResolvedValue(newer);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("readVocabulary", () => {
    it("is null with nothing stored", () => {
      expect(readVocabulary(NOW)).toBeNull();
    });

    it("is fresh within a day, stale after", () => {
      store(NOW - VOCABULARY_TTL_MS + 1);
      expect(readVocabulary(NOW)).toEqual({ vocabulary, fresh: true });
      store(NOW - VOCABULARY_TTL_MS - 1);
      expect(readVocabulary(NOW)).toEqual({ vocabulary, fresh: false });
    });

    it("ignores a corrupt or foreign entry", () => {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, "{not json");
      expect(readVocabulary(NOW)).toBeNull();
      store(NOW, { scenes: "bus" });
      expect(readVocabulary(NOW)).toBeNull();
    });
  });

  describe("loadVocabulary", () => {
    it("serves a fresh copy without asking the backend", async () => {
      store(NOW - 1000);
      await expect(loadVocabulary(NOW)).resolves.toEqual(vocabulary);
      expect(getVocabulary).not.toHaveBeenCalled();
    });

    it("fetches and stores when nothing is stored", async () => {
      await expect(loadVocabulary(NOW)).resolves.toEqual(newer);
      expect(readVocabulary(NOW)).toEqual({ vocabulary: newer, fresh: true });
    });

    it("refreshes a stale copy", async () => {
      store(NOW - VOCABULARY_TTL_MS - 1);
      await expect(loadVocabulary(NOW)).resolves.toEqual(newer);
      expect(getVocabulary).toHaveBeenCalledTimes(1);
    });

    it("asks once for fields that load at the same time", async () => {
      await Promise.all([loadVocabulary(NOW), loadVocabulary(NOW), loadVocabulary(NOW)]);
      expect(getVocabulary).toHaveBeenCalledTimes(1);
    });

    it("keeps the stale copy when the refresh fails, and retries next time", async () => {
      store(NOW - VOCABULARY_TTL_MS - 1);
      vi.mocked(getVocabulary).mockRejectedValueOnce(new Error("offline"));
      await expect(loadVocabulary(NOW)).resolves.toEqual(vocabulary);
      await expect(loadVocabulary(NOW)).resolves.toEqual(newer);
    });

    it("is null when there is no copy and the backend fails", async () => {
      vi.mocked(getVocabulary).mockRejectedValue(new Error("Not Found"));
      await expect(loadVocabulary(NOW)).resolves.toBeNull();
    });
  });

  it("clearVocabulary forgets the stored copy", () => {
    store(NOW);
    clearVocabulary();
    expect(readVocabulary(NOW)).toBeNull();
  });

  describe("useVocabulary", () => {
    it("starts from the stored copy, then shows the refreshed one", async () => {
      store(Date.now() - VOCABULARY_TTL_MS - 1);
      const { result } = renderHook(() => useVocabulary());

      await waitFor(() => expect(result.current).toEqual(newer));
      expect(getVocabulary).toHaveBeenCalledTimes(1);
    });

    it("never asks the backend while the stored copy is fresh", async () => {
      store(Date.now());
      const { result } = renderHook(() => useVocabulary());

      await waitFor(() => expect(result.current).toEqual(vocabulary));
      await act(async () => {});
      expect(getVocabulary).not.toHaveBeenCalled();
    });

    it("stays null when there is nothing to show", async () => {
      vi.mocked(getVocabulary).mockRejectedValue(new Error("Not Found"));
      const { result } = renderHook(() => useVocabulary());

      await act(async () => {});
      expect(result.current).toBeNull();
    });
  });
});
