import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/** The signed-in app needs a session, so a crawler would only ever reach the login page. */
const PRIVATE_ROUTES = [
  "/dashboard",
  "/results",
  "/saved",
  "/settings",
  "/pipeline",
  "/clips",
  "/profile",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_ROUTES },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
