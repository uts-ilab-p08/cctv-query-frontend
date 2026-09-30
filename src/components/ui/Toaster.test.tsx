import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/Toaster";
import { showToast, TOAST_DURATION_MS, useToasts } from "@/lib/toast";

describe("Toaster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToasts.setState({ toasts: [] });
  });
  afterEach(() => vi.useRealTimers());

  const region = () => screen.getByRole("region", { name: "Notifications" });

  it("keeps a polite live region on the page, so each new toast is announced once", () => {
    render(<Toaster />);

    expect(region()).toHaveAttribute("aria-live", "polite");
    expect(within(region()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows a toast with its message, detail and action", () => {
    render(<Toaster />);

    act(() => {
      showToast({
        message: "Query saved",
        detail: "red car at the gate",
        action: { label: "View saved queries", href: "/saved" },
      });
    });

    const toast = within(region()).getByRole("listitem");
    expect(toast).toHaveTextContent("Query saved");
    expect(toast).toHaveTextContent("red car at the gate");
    expect(within(toast).getByRole("link", { name: "View saved queries" })).toHaveAttribute(
      "href",
      "/saved",
    );
  });

  it("dismisses itself after a few seconds", () => {
    render(<Toaster />);
    act(() => {
      showToast({ message: "Query saved" });
    });

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + 10));

    expect(screen.queryByText("Query saved")).not.toBeInTheDocument();
  });

  it("waits while the pointer is on it, then dismisses once it leaves", () => {
    render(<Toaster />);
    act(() => {
      showToast({ message: "Query saved" });
    });
    const toast = within(region()).getByRole("listitem");

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3));
    expect(screen.getByText("Query saved")).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + 10));
    expect(screen.queryByText("Query saved")).not.toBeInTheDocument();
  });

  it("closes from its close button", () => {
    render(<Toaster />);
    act(() => {
      showToast({ message: "Query saved" });
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.queryByText("Query saved")).not.toBeInTheDocument();
  });

  it("marks errors as such", () => {
    render(<Toaster />);
    act(() => {
      showToast({ message: "Couldn't save this query", tone: "error" });
    });

    expect(within(region()).getByRole("listitem")).toHaveAttribute("data-tone", "error");
  });
});
