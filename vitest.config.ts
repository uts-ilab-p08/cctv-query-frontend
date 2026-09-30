import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    // Next turns `import shot from "./x.webp"` into StaticImageData ({ src, width, height })
    // with a content-hashed URL under /_next/static/media/. Mirror that shape in tests.
    {
      name: "static-image-data",
      enforce: "pre",
      load(id) {
        if (!/\.(png|jpe?g|webp|avif)$/.test(id)) return null;
        const name = id
          .split("/")
          .pop()!
          .replace(/\.[^.]+$/, "");
        return `export default { src: "/_next/static/media/${name}.test.webp", width: 1600, height: 1000 };`;
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
