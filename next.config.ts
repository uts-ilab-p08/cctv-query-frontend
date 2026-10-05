import type { NextConfig } from "next";

import { readAppCommit, readAppVersion } from "./build-info";

const nextConfig: NextConfig = {
  // Inlined at build time; read through `src/lib/version.ts`.
  env: {
    NEXT_PUBLIC_APP_VERSION: readAppVersion(),
    NEXT_PUBLIC_APP_COMMIT: readAppCommit(),
  },
  images: {
    // 90 is for the landing's product screenshots (see LandingPage.tsx). Next 16 only
    // accepts qualities listed here, and defaults to [75].
    qualities: [75, 90],
  },
};

export default nextConfig;
