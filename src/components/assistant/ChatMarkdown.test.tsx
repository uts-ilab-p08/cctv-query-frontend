import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatMarkdown } from "@/components/assistant/ChatMarkdown";

describe("ChatMarkdown", () => {
  it("renders emphasis, lists and inline code instead of showing the markup", () => {
    const { container } = render(
      <ChatMarkdown
        text={"**Two** cameras matched:\n\n- G328 at the `north` gate\n- G330, _briefly_"}
      />,
    );

    expect(screen.getByText("Two").tagName).toBe("STRONG");
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("north").tagName).toBe("CODE");
    expect(screen.getByText("briefly").tagName).toBe("EM");
    expect(container).not.toHaveTextContent("**");
  });

  it("renders numbered lists and tables", () => {
    render(
      <ChatMarkdown
        text={"1. First\n2. Second\n\n| Camera | Matches |\n| --- | --- |\n| G328 | 3 |"}
      />,
    );

    expect(screen.getAllByRole("list")[0].tagName).toBe("OL");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "G328" })).toBeInTheDocument();
  });

  it("shows each citation as a source chip that opens its moment", async () => {
    const opened: string[] = [];
    const sources = {
      1: { id: "a", label: "Vehicle arrival · G328 · 0:12" },
      2: { id: "b", label: "Person exits · G330 · 1:05" },
    } as const;
    render(
      <ChatMarkdown
        text="A car arrives [1] and a person leaves [2]."
        source={(ref) => sources[ref as 1 | 2]}
        onOpenSource={(id) => opened.push(id)}
      />,
    );

    const chip = screen.getByRole("button", { name: "Source 2: Person exits · G330 · 1:05" });
    expect(chip).toHaveTextContent("2");
    chip.click();
    expect(opened).toEqual(["b"]);
  });

  it("turns a time the answer names into a link that plays its moment there", async () => {
    const played: Array<[string, number]> = [];
    const moments = [
      {
        id: "evt-1",
        camera: "G638",
        code: "G638",
        ts: "1:12",
        date: "",
        order: 0,
        confidence: 90,
        tags: [],
        objects: "",
        action: "Person stands",
        ref: 1,
        videoId: "v638",
        captureStartLocal: "2018-03-05T16:50:00",
        startSeconds: 72,
        endSeconds: 82,
      },
    ];
    render(
      <ChatMarkdown
        text="A person stands at 16:51:12–16:51:22 [1]."
        source={(ref) =>
          ref === 1 ? { id: "evt-1", label: "Person stands · G638 · 1:12" } : undefined
        }
        moments={moments}
        onOpenTime={(id, sec) => played.push([id, sec])}
      />,
    );

    const link = screen.getByRole("button", { name: "Play G638 at 16:51:12–16:51:22" });
    expect(link).toHaveTextContent("16:51:12–16:51:22");
    link.click();
    expect(played).toEqual([["evt-1", 72]]);
    // The citation after it is still its own chip.
    expect(
      screen.getByRole("button", { name: "Source 1: Person stands · G638 · 1:12" }),
    ).toBeInTheDocument();
  });

  it("leaves times as text when the chat can't play them", () => {
    render(<ChatMarkdown text="Seen at 16:51:12." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Seen at 16:51:12.")).toBeInTheDocument();
  });

  it("leaves a citation as plain text when no moment matches it", () => {
    const { container } = render(
      <ChatMarkdown text="Also seen [9]." source={() => undefined} onOpenSource={() => {}} />,
    );

    expect(container).toHaveTextContent("Also seen [9].");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps citations as written when the chat has no sources to point at", () => {
    const { container } = render(<ChatMarkdown text="Seen at the gate [1]." />);

    expect(container).toHaveTextContent("Seen at the gate [1].");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens links in a new tab, safely", () => {
    render(<ChatMarkdown text="See [the docs](https://example.com/docs)." />);

    const link = screen.getByRole("link", { name: "the docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("never renders raw HTML or script links from the model's answer", () => {
    const { container } = render(
      <ChatMarkdown text={'<img src="x" onerror="alert(1)"> [click](javascript:alert(1))'} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("click").closest("a")?.getAttribute("href") ?? "").not.toMatch(
      /javascript:/i,
    );
  });
});
