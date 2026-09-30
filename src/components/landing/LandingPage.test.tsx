import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "@/components/landing/LandingPage";

const AUTHORS = [
  ["Abhishek Chopda", "abychopda"],
  ["Gourika Sood", "gourika22"],
  ["Juan Sebastian Vargas", "Sebas102507"],
  ["Maria Jose Bustamante", "mariajosebustamante99"],
  ["Nelkit Chavez", "Nelkit"],
  ["Saurabh Sabharwal", "finegoodok"],
] as const;

/** A product screenshot: imported as a static asset, so served from /_next/static/media/
 *  (through next/image's /_next/image?url=…). */
const SCREENSHOT = /\/_next\/static\/media\/(results-tracking|results-metadata|home)\./;
const isScreenshot = (img: HTMLElement) =>
  SCREENSHOT.test(decodeURIComponent(img.getAttribute("src") ?? ""));

describe("LandingPage", () => {
  it("shows the real product, not a mock-up", () => {
    render(<LandingPage />);

    const shots = screen
      .getAllByRole("img")
      // next/image serves them through /_next/image?url=%2Flanding%2F…
      .filter(isScreenshot);
    expect(shots.length).toBeGreaterThanOrEqual(3);
    shots.forEach((shot) => expect(shot.getAttribute("alt")?.length).toBeGreaterThan(20));
  });

  it("pairs the headline with the real workspace, side by side on wide screens", () => {
    render(<LandingPage />);

    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;
    const shot = within(hero)
      .getAllByRole("img")
      .find((img) =>
        decodeURIComponent(img.getAttribute("src") ?? "").includes("results-tracking"),
      );
    expect(shot).toBeDefined();
    expect(hero.querySelector("[data-hero-grid]")).toHaveClass(
      "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]",
    );
  });

  it("keeps the hero screenshot flat, since a 3D tilt re-samples it and blurs its text", () => {
    render(<LandingPage />);

    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;
    const transformed = [...hero.querySelectorAll<HTMLElement>("[class]")].filter((el) =>
      /perspective|rotate[XY]/.test(el.className),
    );
    expect(transformed.map((el) => el.className)).toEqual([]);
  });

  it("lifts the hero screenshot on hover without scaling it, so it stays sharp", () => {
    render(<LandingPage />);

    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;
    const group = hero.querySelector(".group\\/hero")!;
    expect(group).not.toBeNull();

    const frame = group.querySelector("[data-hero-frame]")!;
    expect(frame).toHaveClass(
      "group-hover/hero:-translate-y-1.5",
      "group-hover/hero:border-accent-line",
    );
    expect(group.querySelector("[data-hero-query]")).toHaveClass(
      "group-hover/hero:-translate-x-1.5",
    );
    expect(group.querySelector("[data-hero-glow]")).toHaveClass("group-hover/hero:opacity-100");

    // Scaling re-samples the screenshot, which blurs its text like the old 3D tilt did.
    const scaled = [...group.querySelectorAll<HTMLElement>("[class]")].filter((el) =>
      /(^|\s)(group-hover\/hero:)?scale-/.test(el.className),
    );
    expect(scaled).toEqual([]);
  });

  it("keeps the floating query card decorative, since the screenshot already shows it", () => {
    render(<LandingPage />);

    const card = document.querySelector("[data-hero-query]");
    expect(card).toHaveAttribute("aria-hidden", "true");
    expect(card).toHaveTextContent("Did someone carry a heavy object in this scene?");
    expect(card).toHaveTextContent("5 matching moments");
  });

  it("imports the screenshots as static assets, so a new version gets a new URL", () => {
    render(<LandingPage />);

    // Content-hashed URLs: no cache can keep serving an old screenshot under the same name.
    const shots = screen.getAllByRole("img").filter(isScreenshot);
    expect(shots).toHaveLength(3);
    shots.forEach((shot) =>
      expect(decodeURIComponent(shot.getAttribute("src") ?? "")).not.toMatch(/url=\/landing\//),
    );
  });

  it("serves the screenshots at high quality, so the interface text stays sharp", () => {
    render(<LandingPage />);

    const shots = screen.getAllByRole("img").filter(isScreenshot);
    shots.forEach((shot) => expect(shot.getAttribute("src")).toMatch(/[?&]q=90\b/));
  });

  it("offers the dark and light themes right in the header", () => {
    render(<LandingPage />);

    const header = screen.getByRole("banner");
    const theme = within(header).getByRole("radiogroup", { name: "Theme" });
    expect(within(theme).getByRole("radio", { name: "Dark" })).toBeInTheDocument();
    expect(within(theme).getByRole("radio", { name: "Light" })).toBeInTheDocument();
  });

  it("describes the project to search engines as structured data", () => {
    const { container } = render(<LandingPage />);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");
    const app = data["@graph"].find(
      (node: { "@type": string }) => node["@type"] === "SoftwareApplication",
    );
    expect(app.creator).toHaveLength(6);
    expect(app.creator.map((person: { sameAs: string }) => person.sameAs)).toContain(
      "https://github.com/Nelkit",
    );
    expect(app.sourceOrganization.name).toBe("University of Technology Sydney");
  });

  it("shows real questions people ask, grounded in what MEVA annotates", () => {
    render(<LandingPage />);

    const examples = screen.getByRole("list", { name: "Example questions" });
    const questions = within(examples)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(questions).toEqual(
      expect.arrayContaining([
        "Did someone carry a heavy object in this scene?",
        "Did anyone open a car trunk in the school parking lot?",
        "Was there a vehicle that turned right in the school parking lot?",
      ]),
    );
    expect(questions.length).toBeGreaterThanOrEqual(6);
  });

  it("credits the six authors, each linking to their GitHub profile", () => {
    render(<LandingPage />);

    const team = screen.getByRole("region", { name: /team/i });
    for (const [name, handle] of AUTHORS) {
      expect(within(team).getByText(name)).toBeInTheDocument();
      const link = within(team).getByRole("link", { name: new RegExp(`@${handle}`) });
      expect(link).toHaveAttribute("href", `https://github.com/${handle}`);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("says it's a UTS capstone for the Master of Data Science and Innovation", () => {
    render(<LandingPage />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("University of Technology Sydney");
    expect(footer).toHaveTextContent("Master of Data Science and Innovation");
    expect(footer).toHaveTextContent("36105 iLab: Capstone Project");
  });

  it("frames the system as general-purpose video retrieval, not a policing tool", () => {
    const { container } = render(<LandingPage />);

    expect(container).not.toHaveTextContent(/precinct|badge|agency/i);
  });

  it("links the header to its sections", () => {
    render(<LandingPage />);

    const nav = within(screen.getByRole("banner")).getByRole("navigation");
    for (const [label, target] of [
      ["How it works", "#how"],
      ["Product", "#product"],
      ["Team", "#team"],
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", target);
    }
    for (const id of ["how", "product", "team"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
