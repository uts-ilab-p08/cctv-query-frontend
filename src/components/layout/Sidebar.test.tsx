import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { email: "sam.rivera@example.com" } } }),
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
    for (const name of ["Search", "Saved Queries", "Indexed Cameras", "Settings"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    }
    // The annotation pipeline left the menu; the camera directory took its place.
    expect(
      within(nav).queryByRole("link", { name: "Annotation Pipeline" }),
    ).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Indexed Cameras" })).toHaveAttribute(
      "href",
      "/cameras",
    );
    // Labels are hidden visually, not removed: screen readers still get them.
    expect(within(nav).getByText("Saved Queries")).toHaveClass("sr-only");
    expect(screen.queryByText("sam.rivera@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CCTV AI Assistant" })).toBeInTheDocument();
  });

  it("signs out through the server, which clears the session and redirects to login", async () => {
    render(<Sidebar />);

    const button = screen.getByRole("button", { name: "Sign out" });
    const form = button.closest("form");
    expect(form).toHaveAttribute("action", "/auth/signout");
    expect(form).toHaveAttribute("method", "post");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("locks the button while signing out, so a second click can't stack up", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    const button = screen.getByRole("button", { name: "Sign out" });
    // jsdom can't navigate: stop the browser's own submission, React still sees the event.
    button.closest("form")!.addEventListener("submit", (event) => event.preventDefault());

    await user.click(button);

    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
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
