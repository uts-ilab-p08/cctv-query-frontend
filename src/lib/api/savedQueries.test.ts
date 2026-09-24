import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { deleteSavedQuery, getSavedQueries } from "./endpoints";
import { apiSavedQueryToSavedQuery } from "./normalize";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));

const row = { id: "sq-1", text: "red car", savedOn: "Aug 4", hits: 3 };

describe("getSavedQueries", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("reads the { queries } envelope", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ queries: [row] });
    await expect(getSavedQueries()).resolves.toEqual([row]);
  });

  it("also accepts a bare array, since the envelope is untyped in OpenAPI", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([row]);
    await expect(getSavedQueries()).resolves.toEqual([row]);
  });

  it("falls back to an empty list for an unknown envelope", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [row] });
    await expect(getSavedQueries()).resolves.toEqual([]);
  });
});

describe("apiSavedQueryToSavedQuery", () => {
  it("formats an ISO timestamp as a short date", () => {
    const saved = apiSavedQueryToSavedQuery({ ...row, savedOn: "2026-09-24T12:00:00Z" });
    expect(saved.savedOn).toBe("Sep 24");
  });

  it("passes an already human-readable value through", () => {
    expect(apiSavedQueryToSavedQuery(row).savedOn).toBe("Aug 4");
  });
});

describe("deleteSavedQuery", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("sends DELETE /api/v1/queries/saved/{id} (proposed endpoint)", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
    await deleteSavedQuery("sq 1/x");
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/queries/saved/sq%201%2Fx", { method: "DELETE" });
  });
});
