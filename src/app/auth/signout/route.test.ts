import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const signOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

const request = () => new NextRequest("https://www.cctvai.site/auth/signout", { method: "POST" });

describe("POST /auth/signout", () => {
  beforeEach(() => signOut.mockReset().mockResolvedValue({ error: null }));

  it("ends this browser's session and sends it to the login page", async () => {
    const response = await POST(request());

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    // 303: the browser follows the form's POST with a GET.
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.cctvai.site/login");
  });

  it("still sends the browser to the login page when Supabase fails", async () => {
    signOut.mockRejectedValueOnce(new Error("network down"));

    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.cctvai.site/login");
  });
});
