import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginScreen } from "@/components/login/LoginScreen";
import { pushMock } from "@/test/setup-router";

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));

describe("LoginScreen", () => {
  beforeEach(() => {
    signInWithPassword.mockReset().mockResolvedValue({ error: null });
    pushMock.mockClear();
  });

  it("signs in when Enter is pressed in the password field", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("BADGE EMAIL"), "l.ortiz@precinct.gov");
    await user.type(screen.getByLabelText("PASSWORD"), "hunter22{Enter}");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "l.ortiz@precinct.gov",
      password: "hunter22",
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("signs in when Enter is pressed in the email field", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("PASSWORD"), "hunter22");
    await user.type(screen.getByLabelText("BADGE EMAIL"), "l.ortiz@precinct.gov{Enter}");

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("does not call the backend when Enter is pressed with a field empty", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("BADGE EMAIL"), "l.ortiz@precinct.gov{Enter}");

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter your badge email and password/);
  });
});
