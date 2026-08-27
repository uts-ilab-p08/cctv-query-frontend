import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Surveillance Video Query AI",
  description:
    "Search annotated CCTV footage in natural language, review matching clips and queue footage for annotation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-canvas text-ink antialiased">
        <BackgroundOrbs />
        {children}
      </body>
    </html>
  );
}
