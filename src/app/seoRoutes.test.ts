import { describe, expect, it, vi } from "vitest";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

const PRIVATE = [
  "/dashboard",
  "/results",
  "/saved",
  "/settings",
  "/pipeline",
  "/cameras",
  "/clips",
  "/profile",
];

describe("robots.txt", () => {
  it("lets crawlers read the public pages but not the signed-in app", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule).toMatchObject({ userAgent: "*", allow: "/" });
    expect(rule.disallow).toEqual(expect.arrayContaining(PRIVATE));
  });

  it("points crawlers at the sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe("sitemap.xml", () => {
  it("lists the public pages only", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([`${SITE_URL}/`, `${SITE_URL}/login`]);
  });
});

describe("web app manifest", () => {
  it("names the app and opens it on the search screen", () => {
    expect(manifest()).toMatchObject({
      name: "CCTV AI Assistant",
      short_name: "CCTV AI",
      start_url: "/dashboard",
      display: "standalone",
    });
    expect(manifest().icons?.length).toBeGreaterThan(0);
  });
});

describe("auth middleware", () => {
  it("never sends crawlers to the login page for robots, sitemap or manifest", async () => {
    const { config } = await import("@/middleware");
    const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

    for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
      expect(matches(path)).toBe(false);
    }
    expect(matches("/dashboard")).toBe(true);
  });
});
