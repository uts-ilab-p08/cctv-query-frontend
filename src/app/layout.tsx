import type { Metadata } from "next";
import { Archivo, Barlow, Barlow_Semi_Condensed, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";

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

/* DIN (Barlow): opt-in typeface for Results/Login/Landing via `font-barlow`.
   Does not replace Archivo (--font-sans), which the rest of the app keeps using. */
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-ui",
  display: "swap",
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-semicond",
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
      className={`${archivo.variable} ${ibmPlexMono.variable} ${barlow.variable} ${barlowSemiCondensed.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased">
        <Script id="cctv-theme" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
