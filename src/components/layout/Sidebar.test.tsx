import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { email: "sam.rivera@example.com" } } }),
      signOut: async () => ({}),
    },
  }),
}));

const sidebar = () => screen.getByRole("complementary", { name: "Main menu" });

describe("Sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("collapses to icons while every destination keeps its accessible name", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await screen.findByText("sam.rivera@example.com");

    await user.click(screen.getByRole("button", { name: "Collapse menu" }));

    expect(sidebar()).toHaveAttribute("data-collapsed", "true");
    const nav = within(sidebar()).getByRole("navigation", { name: "Main" });
    for (const name of ["Search", "Saved Queries", "Annotation Pipeline", "Settings"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    }
    // Labels are hidden visually, not removed: screen readers still get them.
    expect(within(nav).getByText("Saved Queries")).toHaveClass("sr-only");
    expect(screen.queryByText("sam.rivera@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CCTV AI Assistant" })).toBeInTheDocument();
  });

  it("shows the signed-in user without a precinct", async () => {
    render(<Sidebar />);

    expect(await screen.findByText("sam.rivera@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/^Precinct/)).not.toBeInTheDocument();
  });

  it("wraps the user in a card that opens their profile", async () => {
    render(<Sidebar />);

    const card = await screen.findByRole("link", { name: /Sam.*sam\.rivera@example\.com/ });
    expect(card).toHaveAttribute("href", "/profile");
    expect(within(card).getByText("SR")).toBeInTheDocument();
  });

  it("keeps the profile link as the avatar alone when collapsed", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await screen.findByText("sam.rivera@example.com");

    await user.click(screen.getByRole("button", { name: "Collapse menu" }));

    const avatar = screen.getByRole("link", { name: "Profile: sam.rivera@example.com" });
    expect(avatar).toHaveAttribute("href", "/profile");
    expect(within(avatar).getByText("SR")).toBeInTheDocument();
  });

  it("greets the user by the first name in their email, with the email below", async () => {
    render(<Sidebar />);

    const email = await screen.findByText("sam.rivera@example.com");
    const name = screen.getByText("Sam");
    // Name first, then the email.
    expect(name.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("expands back", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Collapse menu" }));
    await user.click(screen.getByRole("button", { name: "Expand menu" }));

    expect(sidebar()).toHaveAttribute("data-collapsed", "false");
    expect(within(sidebar()).getByText("Saved Queries")).not.toHaveClass("sr-only");
  });

  it("remembers the choice across visits", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Sidebar />);
    await user.click(screen.getByRole("button", { name: "Collapse menu" }));
    unmount();

    render(<Sidebar />);

    expect(await screen.findByRole("button", { name: "Expand menu" })).toBeInTheDocument();
  });

  it("opens Settings as a page", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });
});
