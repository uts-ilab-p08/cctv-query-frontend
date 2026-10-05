import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VersionFooter } from "@/components/dashboard/VersionFooter";

describe("VersionFooter", () => {
  it("shows the running version, linked to its GitHub release", () => {
    render(<VersionFooter />);

    const footer = screen.getByRole("contentinfo");
    const link = within(footer).getByRole("link", { name: /v1\.4\.2/ });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/uts-ilab-p08/cctv-query-frontend/releases/tag/v1.4.2",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("names the build's commit next to the version", () => {
    render(<VersionFooter />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent("abc1234");
  });
});
