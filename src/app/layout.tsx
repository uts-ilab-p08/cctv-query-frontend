import { Archivo, IBM_Plex_Mono, Michroma, Saira } from "next/font/google";
import Script from "next/script";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEFAULT_PALETTE, paletteInitScript } from "@/lib/palette";
import { siteMetadata, siteViewport } from "@/lib/seo";
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

/* Eurostile-style pairing: opt-in typeface for Results/Login/Landing via `font-barlow`.
   Does not replace Archivo (--font-sans), which the rest of the app keeps using. */
const saira = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-ui",
  display: "swap",
});

/* Michroma ships a single weight (400) — used only for the wordmark and short
   display headings, never for body copy (its wide letterforms hurt legibility
   past a few words). */
const michroma = Michroma({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-barlow-semicond",
  display: "swap",
});

/* Defined in @/lib/seo, where they can be tested without next/font. */
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-palette={DEFAULT_PALETTE}
      className={`${archivo.variable} ${ibmPlexMono.variable} ${saira.variable} ${michroma.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink antialiased">
        {/* Anti-flash: both theme (dark/light) and palette (see src/lib/palette.ts) must be
            stamped on <html> before the first paint, so this runs as one script. */}
        <Script id="cctv-theme" strategy="beforeInteractive">
          {`${themeInitScript}${paletteInitScript}`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
