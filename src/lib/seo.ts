import type { Metadata, Viewport } from "next";

/** The public site. Every relative URL in the metadata resolves against it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cctvai.site").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "CCTV AI";

const TITLE = "CCTV AI: natural-language search for multi-camera CCTV footage";

const DESCRIPTION =
  "Ask multi-camera CCTV footage questions in plain language and get the exact moments back, with cited answers. A UTS data science capstone.";

/** Project 08-01's team and roles, as confirmed by the team (these supersede the
 *  proposal's Table 19). */
export const TEAM = [
  { name: "Abhishek Chopda", handle: "abychopda", role: "RAG Lead" },
  { name: "Gourika Sood", handle: "gourika22", role: "Backend Lead · RAG Researcher" },
  { name: "Juan Sebastian Vargas", handle: "Sebas102507", role: "Video Annotation Lead" },
  {
    name: "Maria Jose Bustamante",
    handle: "mariajosebustamante99",
    role: "Evaluation Lead",
  },
  { name: "Nelkit Chavez", handle: "Nelkit", role: "Frontend Lead · Backend support" },
  {
    name: "Saurabh Sabharwal",
    handle: "finegoodok",
    role: "Video Annotation Researcher · Evaluation Lead",
  },
] as const;

const githubUrl = (handle: string) => `https://github.com/${handle}`;

const UTS = {
  "@type": "CollegeOrUniversity",
  name: "University of Technology Sydney",
  url: "https://www.uts.edu.au",
};

/**
 * Root metadata. Open Graph and Twitter images come from the file conventions
 * `app/opengraph-image.jpg` and `app/twitter-image.jpg`, which Next adds with their size
 * and alt text; the favicon and Apple icon from `app/icon.svg` and `app/apple-icon.svg`.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: "CCTV AI Assistant",
  keywords: [
    "natural-language video search",
    "CCTV footage search",
    "multi-camera video retrieval",
    "retrieval-augmented generation",
    "RAG",
    "large language models",
    "vision-language models",
    "MEVA dataset",
    "video analytics",
    "UTS capstone",
  ],
  authors: TEAM.map((member) => ({ name: member.name, url: githubUrl(member.handle) })),
  creator: "UTS iLab capstone team, project 08-01",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    locale: "en_AU",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

/** The signed-in app: nothing there is useful, or reachable, from a search result. */
export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export const siteViewport: Viewport = {
  // Page backgrounds of the default dark palette (slate) and of the light theme.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d12" },
    { media: "(prefers-color-scheme: light)", color: "#e9e9ec" },
  ],
  colorScheme: "dark light",
};

/** schema.org description of the site and the software, for search engines. */
export function structuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: DESCRIPTION,
        inLanguage: "en-AU",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "CCTV AI Assistant",
        url: `${SITE_URL}/`,
        description: DESCRIPTION,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        image: `${SITE_URL}/opengraph-image.jpg`,
        creator: TEAM.map((member) => ({
          "@type": "Person",
          name: member.name,
          sameAs: githubUrl(member.handle),
        })),
        sourceOrganization: UTS,
        isPartOf: {
          "@type": "Course",
          name: "36105 iLab: Capstone Project",
          provider: UTS,
        },
      },
    ],
  };
}
