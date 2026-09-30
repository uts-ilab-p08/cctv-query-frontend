import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Thumbnail } from "@/components/ui/Thumbnail";

const spinner = () => screen.queryByRole("status", { name: "Loading thumbnail" });

describe("Thumbnail", () => {
  it("is just the gray placeholder when there is no image", () => {
    const { container } = render(<Thumbnail />);

    expect(container.querySelector("img")).toBeNull();
    expect(spinner()).not.toBeInTheDocument();
  });

  it("shows a spinner until the image loads, then the image", () => {
    const { container } = render(<Thumbnail src="https://cdn.test/thumb.jpg" />);
    const img = container.querySelector("img")!;

    expect(spinner()).toBeInTheDocument();
    expect(img).toHaveAttribute("data-loaded", "false");

    fireEvent.load(img);

    expect(spinner()).not.toBeInTheDocument();
    expect(img).toHaveAttribute("data-loaded", "true");
  });

  it("falls back to the placeholder when the image fails", () => {
    const { container } = render(<Thumbnail src="https://cdn.test/missing.jpg" />);

    fireEvent.error(container.querySelector("img")!);

    expect(spinner()).not.toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("starts loading again when the image changes", () => {
    const { container, rerender } = render(<Thumbnail src="https://cdn.test/a.jpg" />);
    fireEvent.load(container.querySelector("img")!);

    rerender(<Thumbnail src="https://cdn.test/b.jpg" />);

    expect(spinner()).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.test/b.jpg");
  });
});
