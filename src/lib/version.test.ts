import { describe, expect, it } from "vitest";

import { APP_COMMIT, APP_VERSION, releaseUrl, versionLabel } from "@/lib/version";

// vitest.config.ts pins the build info, so these don't move with every release.
describe("version", () => {
  it("reads the version and commit the build injected", () => {
    expect(APP_VERSION).toBe("1.4.2");
    expect(APP_COMMIT).toBe("abc1234");
  });

  it("labels a version the way its git tag is named", () => {
    expect(versionLabel("1.4.2")).toBe("v1.4.2");
  });

  it("links a version to its GitHub release", () => {
    expect(releaseUrl("1.4.2")).toBe(
      "https://github.com/uts-ilab-p08/cctv-query-frontend/releases/tag/v1.4.2",
    );
  });
});
