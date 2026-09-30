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

    await user.type(screen.getByLabelText("EMAIL"), "sam@example.com");
    await user.type(screen.getByLabelText("PASSWORD"), "hunter22{Enter}");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "hunter22",
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("signs in when Enter is pressed in the email field", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("PASSWORD"), "hunter22");
    await user.type(screen.getByLabelText("EMAIL"), "sam@example.com{Enter}");

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("does not call the backend when Enter is pressed with a field empty", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("EMAIL"), "sam@example.com{Enter}");

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter your email and password/);
  });

  it("has no remember-me toggle, since the session persists either way", () => {
    render(<LoginScreen />);

    expect(screen.queryByText(/trust this terminal/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
  });

  it("speaks about the project, not about police precincts or made-up numbers", () => {
    const { container } = render(<LoginScreen />);

    expect(container).not.toHaveTextContent(/precinct|badge|agency|audit-logged|cameras indexed/i);
    expect(container).toHaveTextContent(/UTS/);
    expect(container).toHaveTextContent(/MEVA/);
  });

  it("shares the landing's headline and titles the form Sign in", () => {
    render(<LoginScreen />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Ask your camera archive a question. Get the moment, not the tape.",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Sign in" })).toBeInTheDocument();
  });
});
