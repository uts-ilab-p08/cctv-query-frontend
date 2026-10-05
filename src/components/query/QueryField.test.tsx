import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryField } from "@/components/query/QueryField";
import { getCameras } from "@/lib/api/endpoints";
import { useAppStore } from "@/store/useAppStore";
import { resetStore } from "@/test/utils";

vi.mock("@/lib/api/endpoints", () => ({ getCameras: vi.fn() }));

const cameras = [
  { code: "G328", eventCount: 12, scene: "admin" },
  { code: "G420", eventCount: 3, scene: "admin" },
  { code: "G506", eventCount: 4, scene: "bus" },
];

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
    vi.mocked(getCameras).mockReset();
    vi.mocked(getCameras).mockResolvedValue(cameras);
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
    useAppStore.setState({ query: "anyone entered the lobby" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("anyone"));
    await user.click(screen.getByRole("button", { name: "vehicle" }));

    expect(useAppStore.getState().query).toBe("vehicle entered the lobby");
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

  it("never sends a term as a separate filter: the RAG reads it from the text", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "vehicle with low confidence" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("low confidence"));
    await user.click(screen.getByRole("button", { name: "high confidence" }));

    expect(useAppStore.getState().query).toBe("vehicle with high confidence");
    expect(useAppStore.getState()).not.toHaveProperty("filters");
  });

  it("always offers the camera picker — natural language is the only mode", () => {
    render(<QueryField onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Choose cameras" })).toBeInTheDocument();
  });

  it("lists the indexed cameras, marking the ones the query already names", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "who left on camera G328?" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose cameras" }));

    const picker = await screen.findByRole("group", { name: "Search in cameras" });
    expect(await within(picker).findByRole("button", { name: "G328" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(picker).getByRole("button", { name: "G420" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(picker).getByRole("button", { name: "G506" })).toBeInTheDocument();
  });

  it("adds a picked camera to the query text, and removes it when unpicked", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "who left the building?" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose cameras" }));
    const picker = await screen.findByRole("group", { name: "Search in cameras" });
    await user.click(await within(picker).findByRole("button", { name: "G328" }));
    expect(useAppStore.getState().query).toBe("who left the building on camera G328?");

    await user.click(within(picker).getByRole("button", { name: "G420" }));
    expect(useAppStore.getState().query).toBe("who left the building on cameras G328, G420?");

    await user.click(within(picker).getByRole("button", { name: "G328" }));
    await user.click(within(picker).getByRole("button", { name: "G420" }));
    expect(useAppStore.getState().query).toBe("who left the building?");
  });

  it("underlines camera codes typed in the query and swaps them for an indexed camera", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "Search cameras G45, G328 for anyone" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(token("G45"));

    expect(screen.getByText("Camera")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "G506" }));
    expect(useAppStore.getState().query).toBe("Search cameras G506, G328 for anyone");
  });

  it("says so when the cameras can't be loaded", async () => {
    const user = userEvent.setup();
    vi.mocked(getCameras).mockRejectedValue(new Error("offline"));
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose cameras" }));

    expect(await screen.findByText("Couldn't load the cameras.")).toBeInTheDocument();
  });

  it("picks cameras into the local draft when controlled", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "red car" });
    const onChange = vi.fn();
    render(<QueryField value="who left" onChange={onChange} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose cameras" }));
    const picker = await screen.findByRole("group", { name: "Search in cameras" });
    await user.click(await within(picker).findByRole("button", { name: "G506" }));

    expect(onChange).toHaveBeenCalledWith("who left on camera G506");
    expect(useAppStore.getState().query).toBe("red car");
  });

  it("offers a time picker right beside the camera picker", () => {
    render(<QueryField onSubmit={vi.fn()} />);
    const cameraButton = screen.getByRole("button", { name: "Choose cameras" });
    expect(cameraButton.previousElementSibling).toBe(
      screen.getByRole("button", { name: "Choose a time" }),
    );
  });

  it("underlines a time typed in plain words and shows it in the picker", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "At 7:00 pm which events occurred in the hospital cameras" });
    render(<QueryField onSubmit={vi.fn()} />);

    expect(token("At 7:00 pm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose a time" }));

    const picker = screen.getByRole("group", { name: "Search at a time" });
    expect(within(picker).getByRole("button", { name: "At" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(picker).getByLabelText("Time")).toHaveValue("19:00");
  });

  it("writes the picked time into the query, replacing it rather than adding another", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "who left on camera G328?" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    const picker = screen.getByRole("group", { name: "Search at a time" });
    fireEvent.change(within(picker).getByLabelText("Time"), { target: { value: "19:00" } });
    expect(useAppStore.getState().query).toBe("who left on camera G328 at 7:00 pm?");

    fireEvent.change(within(picker).getByLabelText("Time"), { target: { value: "21:00" } });
    expect(useAppStore.getState().query).toBe("who left on camera G328 at 9:00 pm?");

    await user.click(within(picker).getByRole("button", { name: "Between" }));
    expect(useAppStore.getState().query).toBe(
      "who left on camera G328 between 9:00 pm and 10:00 pm?",
    );
    fireEvent.change(within(picker).getByLabelText("To"), { target: { value: "23:30" } });
    expect(useAppStore.getState().query).toBe(
      "who left on camera G328 between 9:00 pm and 11:30 pm?",
    );
  });

  it("clears the picker when the time leaves the text, and the text on Clear time", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "who left after 14:00" });
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    const picker = screen.getByRole("group", { name: "Search at a time" });
    expect(within(picker).getByLabelText("Time")).toHaveValue("14:00");

    await user.click(within(picker).getByRole("button", { name: "Clear time" }));
    expect(useAppStore.getState().query).toBe("who left");
    expect(within(picker).getByLabelText("Time")).toHaveValue("");

    fireEvent.change(within(picker).getByLabelText("Time"), { target: { value: "08:00" } });
    expect(useAppStore.getState().query).toBe("who left after 8:00 am");
    fireEvent.change(screen.getByRole("textbox", { name: "Search the camera network" }), {
      target: { value: "who left" },
    });
    expect(within(picker).getByLabelText("Time")).toHaveValue("");
    expect(within(picker).queryByRole("button", { name: "Clear time" })).not.toBeInTheDocument();
  });

  it("opens one picker at a time", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Choose cameras" }));
    await user.click(screen.getByRole("button", { name: "Choose a time" }));

    expect(screen.getByRole("group", { name: "Search at a time" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Search in cameras" })).not.toBeInTheDocument();
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

  it("offers a clear button only from the third character", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Search the camera network" });

    await user.type(input, "re");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();

    await user.type(input, "d");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("empties the field and puts the caret back in it", async () => {
    const user = userEvent.setup();
    render(<QueryField onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Search the camera network" });

    await user.type(input, "red car");
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(useAppStore.getState().query).toBe("");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("clears the local draft when controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QueryField value="red car" onChange={onChange} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onChange).toHaveBeenCalledWith("");
  });
});
