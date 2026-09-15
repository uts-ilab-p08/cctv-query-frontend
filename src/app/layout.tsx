import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";

import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";
import { DEFAULT_THEME, themeInitScript } from "@/lib/theme";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CCTV AI Assistant",
  description:
    "Search annotated CCTV footage in natural language, review matching clips and queue footage for annotation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${archivo.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased">
        <Script id="cctv-theme" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <BackgroundOrbs />
        {children}
      </body>
    </html>
  );
}
