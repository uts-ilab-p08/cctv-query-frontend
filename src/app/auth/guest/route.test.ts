import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const signInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword } }),
}));

const request = (code?: string) =>
  new NextRequest(`https://www.cctvai.site/auth/guest${code === undefined ? "" : `?code=${code}`}`);

describe("GET /auth/guest", () => {
  beforeEach(() => {
    signInWithPassword.mockReset().mockResolvedValue({ error: null });
    vi.stubEnv("GUEST_ACCESS_CODE", "SHOWCASE26");
    vi.stubEnv("GUEST_ACCESS_EXPIRES_AT", "2099-01-01T00:00:00Z");
    vi.stubEnv("GUEST_EMAIL", "guest@cctvai.site");
    vi.stubEnv("GUEST_PASSWORD", "secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("signs a visitor with the current code into the guest account and opens the dashboard", async () => {
    const response = await GET(request("SHOWCASE26"));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "guest@cctvai.site",
      password: "secret",
    });
    expect(response.headers.get("location")).toBe("https://www.cctvai.site/dashboard");
  });

  it("sends a wrong or missing code to the login page without signing in", async () => {
    for (const code of ["WRONG", undefined]) {
      const response = await GET(request(code));
      expect(response.headers.get("location")).toBe("https://www.cctvai.site/login?guest=invalid");
    }
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("refuses the code once it has expired", async () => {
    vi.stubEnv("GUEST_ACCESS_EXPIRES_AT", "2020-01-01T00:00:00Z");

    const response = await GET(request("SHOWCASE26"));

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://www.cctvai.site/login?guest=expired");
  });

  it("refuses every code when guest access isn't configured", async () => {
    vi.stubEnv("GUEST_ACCESS_CODE", "");

    const response = await GET(request("SHOWCASE26"));

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://www.cctvai.site/login?guest=invalid");
  });

  it("explains on the login page when Supabase rejects the guest account", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: new Error("Invalid login credentials") });

    const response = await GET(request("SHOWCASE26"));

    expect(response.headers.get("location")).toBe(
      "https://www.cctvai.site/login?guest=unavailable",
    );
  });
});
