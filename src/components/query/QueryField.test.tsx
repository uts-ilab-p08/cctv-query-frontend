import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryField } from "@/components/query/QueryField";
import { useAppStore } from "@/store/useAppStore";
import { resetStore } from "@/test/utils";

/** The overlay token for `text`, which is what the user actually clicks. */
function token(text: string): HTMLElement {
  const match = screen
    .getAllByText(text, { selector: "span" })
    .find((node) => node.className.includes("border-dashed"));
  if (!match) throw new Error(`no token rendered for "${text}"`);
  return match;
}

describe("QueryField", () => {
  beforeEach(() => {
    resetStore();
  });

  it("underlines a detected term as the user types", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /search/i }), "anyone entered");

    expect(token("anyone")).toBeInTheDocument();
    expect(token("entered")).toBeInTheDocument();
  });

  it("leaves text with no cues unstyled", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /search/i }), "show me everything");

    expect(
      screen
        .getAllByText("show me everything", { selector: "span" })
        .some((node) => node.className.includes("border-dashed")),
    ).toBe(false);
  });

  it("opens the entity menu when a token is clicked", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "anyone entered" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("anyone"));

    expect(screen.getByText("Subject / object")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "vehicle" })).toBeInTheDocument();
  });

  it("rewrites that slice of the query when an option is chosen", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "anyone entered the parking lot" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("anyone"));
    await user.click(screen.getByRole("button", { name: "vehicle" }));

    expect(useAppStore.getState().query).toBe("vehicle entered the parking lot");
  });

  it("restores the caret just after the replacement word", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "anyone entered" });
    render(<QueryField onSubmit={vi.fn()} />);
    const textarea = screen.getByRole("textbox", { name: /search/i }) as HTMLTextAreaElement;

    await user.click(token("anyone"));
    await user.click(screen.getByRole("button", { name: "vehicle" }));

    await vi.waitFor(() => {
      expect(textarea.selectionStart).toBe("vehicle".length);
      expect(textarea.selectionEnd).toBe("vehicle".length);
    });
  });

  it("applies the mapped tag filter for a subject", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "anyone entered" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("anyone"));
    await user.click(screen.getByRole("button", { name: "vehicle" }));

    expect(useAppStore.getState().filters.tags).toContain("Vehicle");
  });

  it("applies the mapped camera filter", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "entered the parking lot" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("parking lot"));
    await user.click(screen.getByRole("button", { name: "loading dock" }));

    expect(useAppStore.getState().query).toBe("entered the loading dock");
    expect(useAppStore.getState().filters.cameras).toEqual(["G421"]);
  });

  it("applies the mapped confidence threshold", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "vehicle with low confidence" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("low confidence"));
    await user.click(screen.getByRole("button", { name: "high confidence" }));

    expect(useAppStore.getState().filters.confidence).toBe(85);
  });

  it("marks the current value as selected in the menu", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "a vehicle entered" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("vehicle"));

    expect(screen.getByRole("button", { name: "vehicle" }).className).toContain("text-accent");
  });

  it("submits on Enter without inserting a newline", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QueryField onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: /search/i });

    await user.type(textarea, "anyone entered{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().query).toBe("anyone entered");
  });

  it("hides the filters action outside classic mode", () => {
    render(<QueryField onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("opens the filters modal from the classic-mode action", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ searchMode: "classic" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Filters" }));

    expect(useAppStore.getState().filtersOpen).toBe(true);
  });

  it("renders the compact variant's placeholder", () => {
    render(<QueryField variant="compact" onSubmit={vi.fn()} />);
    expect(screen.getByText("Ask anything…")).toBeInTheDocument();
  });

  it("keeps the overlay above the textarea so token clicks land", () => {
    useAppStore.setState({ query: "anyone entered" });
    const { container } = render(<QueryField onSubmit={vi.fn()} />);

    const field = container.querySelector(".rounded-field");
    if (!field) throw new Error("field not rendered");
    const overlay = within(field as HTMLElement).getByText("anyone").parentElement;
    const textarea = field.querySelector("textarea");

    expect(overlay?.className).toContain("z-[2]");
    expect(textarea?.className).toContain("z-[1]");
  });

  it("edits a local draft without touching the shared query when controlled", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "red car" });
    const onChange = vi.fn();
    render(<QueryField value="" onChange={onChange} onSubmit={vi.fn()} />);

    const input = screen.getByRole("textbox", { name: "Search the camera network" });
    expect(input).toHaveValue("");

    await user.type(input, "v");

    expect(onChange).toHaveBeenCalledWith("v");
    expect(useAppStore.getState().query).toBe("red car");
  });

  it("uses the opaque floating surface when rendered over a backdrop", () => {
    render(<QueryField floating onSubmit={vi.fn()} />);

    const field = screen.getByRole("textbox", { name: "Search the camera network" }).parentElement;
    expect(field?.className).toContain("glass-panel");
    expect(field?.className).not.toContain("glass-card");
  });

  it("keeps token glyph widths equal to the textarea so the caret stays aligned", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "red car");

    // The caret lives in the plain-weight textarea; a heavier weight on the
    // overlay widens the token and pushes the visible text ahead of the caret.
    expect(token("red car").className).not.toMatch(
      /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black)\b/,
    );
  });
});
