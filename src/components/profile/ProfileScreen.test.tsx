import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileScreen } from "@/components/profile/ProfileScreen";

const getUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

const signedInAs = (email: string | null) =>
  getUser.mockResolvedValue({ data: { user: email ? { email } : null } });

describe("ProfileScreen", () => {
  it("shows the avatar, the full name and the email", async () => {
    signedInAs("nelkit.chavez@gmail.com");
    render(<ProfileScreen />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Nelkit Chavez" }),
    ).toBeInTheDocument();
    expect(screen.getByText("NC")).toBeInTheDocument();
  });

  it("lists the first name, the second name and the full email", async () => {
    signedInAs("nelkit.chavez@gmail.com");
    render(<ProfileScreen />);

    const details = await screen.findByRole("region", { name: "Account" });
    const value = (label: string) =>
      within(details).getByText(label).closest("div")?.querySelector("dd")?.textContent;
    expect(value("First name")).toBe("Nelkit");
    expect(value("Second name")).toBe("Chavez");
    expect(value("Email")).toBe("nelkit.chavez@gmail.com");
    expect(details).toHaveTextContent(/read from your email address/i);
  });

  it("marks a name it can't read instead of guessing", async () => {
    signedInAs("l.ortiz@example.com");
    render(<ProfileScreen />);

    const details = await screen.findByRole("region", { name: "Account" });
    const value = (label: string) =>
      within(details).getByText(label).closest("div")?.querySelector("dd")?.textContent;
    expect(value("First name")).toBe("—");
    expect(value("Second name")).toBe("Ortiz");
  });

  it("holds its place while the account loads", () => {
    getUser.mockReturnValue(new Promise(() => {}));
    render(<ProfileScreen />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
  });
});
