import type { MetadataRoute } from "next";

/** Lets the app be installed, and names and colours it in the browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CCTV AI Assistant",
    short_name: "CCTV AI",
    description:
      "Search multi-camera CCTV footage in natural language and jump straight to the moments that match.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0d12",
    theme_color: "#0a0d12",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
  };
}
