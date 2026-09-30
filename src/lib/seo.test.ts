import { describe, expect, it } from "vitest";

import { privateMetadata, siteMetadata, siteViewport, SITE_URL, TEAM } from "./seo";

describe("site metadata", () => {
  it("resolves every relative URL against the public site", () => {
    expect(siteMetadata.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    expect(SITE_URL).toMatch(/^https:\/\//);
    expect(siteMetadata.alternates?.canonical).toBe("/");
  });

  it("titles each page within the product name", () => {
    expect(siteMetadata.title).toMatchObject({
      default: expect.stringContaining("CCTV AI"),
      template: "%s · CCTV AI",
    });
    expect(String(siteMetadata.description).length).toBeGreaterThan(80);
    expect(String(siteMetadata.description).length).toBeLessThanOrEqual(160);
  });

  it("describes the site for link previews", () => {
    expect(siteMetadata.openGraph).toMatchObject({
      type: "website",
      siteName: "CCTV AI",
      url: "/",
      locale: "en_AU",
    });
    expect(siteMetadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("credits the six authors", () => {
    expect(TEAM).toHaveLength(6);
    expect(siteMetadata.authors).toEqual(
      TEAM.map((member) => ({ name: member.name, url: `https://github.com/${member.handle}` })),
    );
  });

  it("lets search engines index the public pages", () => {
    expect(siteMetadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("keeps the signed-in app out of search results", () => {
    expect(privateMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("colours the browser chrome for both themes", () => {
    expect(siteViewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: dark)", color: expect.stringMatching(/^#/) },
      { media: "(prefers-color-scheme: light)", color: expect.stringMatching(/^#/) },
    ]);
    expect(siteViewport.colorScheme).toBe("dark light");
  });
});
