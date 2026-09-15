import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ResultsScreen } from "@/components/results/ResultsScreen";
import { useAppStore } from "@/store/useAppStore";
import { resetStore } from "@/test/utils";

const panel = () => screen.queryByRole("complementary", { name: "Query Assistant" });

describe("assistant visibility on Results", () => {
  beforeEach(() => {
    resetStore();
  });

  it("is hidden when the results load", () => {
    render(<ResultsScreen />);

    expect(panel()).not.toBeInTheDocument();
    expect(useAppStore.getState().chatOpen).toBe(false);
  });

  it("opens from the Ask more action", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: /Ask more/ }));

    expect(panel()).toBeInTheDocument();
    expect(useAppStore.getState().chatOpen).toBe(true);
  });

  it("closes again from the collapse control", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: /Ask more/ }));
    await user.click(screen.getByRole("button", { name: "Collapse assistant" }));

    expect(panel()).not.toBeInTheDocument();
  });

  it("reserves content space only while the panel is open", async () => {
    const user = userEvent.setup();
    const { container } = render(<ResultsScreen />);
    const layout = container.firstElementChild;

    expect(layout?.className).toContain("pr-8");

    await user.click(screen.getByRole("button", { name: /Ask more/ }));

    expect(layout?.className).toContain("pr-[412px]");
  });

  it("renders the Query AI Overview summary", () => {
    useAppStore.setState({ query: "anyone who entered the parking lot" });
    render(<ResultsScreen />);

    expect(screen.getByText("Query AI Overview")).toBeInTheDocument();
    expect(screen.getByText(/indexed events matching/)).toBeInTheDocument();
  });
});
