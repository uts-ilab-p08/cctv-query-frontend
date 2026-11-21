import { describe, expect, it } from "vitest";

import { checkGuestCode, guestAccessConfig, isExpiredGuest } from "@/lib/guestAccess";

const ENV = {
  GUEST_ACCESS_CODE: "SHOWCASE26",
  GUEST_ACCESS_EXPIRES_AT: "2026-10-22T23:59:00+11:00",
  GUEST_EMAIL: "Guest@cctvai.site",
  GUEST_PASSWORD: "secret",
} as unknown as NodeJS.ProcessEnv;

const config = guestAccessConfig(ENV);
const BEFORE = new Date("2026-10-21T10:00:00+11:00");
const AFTER = new Date("2026-10-23T00:00:00+11:00");

describe("guestAccessConfig", () => {
  it("reads the code, its expiry and the guest account from the environment", () => {
    expect(config).toEqual({
      code: "SHOWCASE26",
      expiresAt: new Date("2026-10-22T12:59:00Z"),
      email: "guest@cctvai.site",
      password: "secret",
    });
  });

  it.each(["GUEST_ACCESS_CODE", "GUEST_ACCESS_EXPIRES_AT", "GUEST_EMAIL", "GUEST_PASSWORD"])(
    "turns guest access off when %s is missing",
    (name) => {
      expect(guestAccessConfig({ ...ENV, [name]: undefined })).toBeNull();
    },
  );

  it("turns guest access off when the expiry isn't a date", () => {
    expect(guestAccessConfig({ ...ENV, GUEST_ACCESS_EXPIRES_AT: "tomorrow" })).toBeNull();
  });
});

describe("checkGuestCode", () => {
  it("accepts the code until it expires", () => {
    expect(checkGuestCode("SHOWCASE26", BEFORE, config)).toBe("valid");
    expect(checkGuestCode(" SHOWCASE26 ", BEFORE, config)).toBe("valid");
    expect(checkGuestCode("SHOWCASE26", AFTER, config)).toBe("expired");
  });

  it("rejects any other code, even before the expiry", () => {
    expect(checkGuestCode("SHOWCASE2", BEFORE, config)).toBe("invalid");
    expect(checkGuestCode("showcase26", BEFORE, config)).toBe("invalid");
    expect(checkGuestCode("", BEFORE, config)).toBe("invalid");
    expect(checkGuestCode(null, BEFORE, config)).toBe("invalid");
  });

  it("accepts nothing when guest access isn't configured", () => {
    expect(checkGuestCode("SHOWCASE26", BEFORE, null)).toBe("disabled");
  });
});

describe("isExpiredGuest", () => {
  it("is true only for the guest account, once the code has expired", () => {
    expect(isExpiredGuest("guest@cctvai.site", AFTER, config)).toBe(true);
    expect(isExpiredGuest("GUEST@cctvai.site", AFTER, config)).toBe(true);
    expect(isExpiredGuest("guest@cctvai.site", BEFORE, config)).toBe(false);
    expect(isExpiredGuest("admin@gmail.com", AFTER, config)).toBe(false);
    expect(isExpiredGuest(undefined, AFTER, config)).toBe(false);
    expect(isExpiredGuest("guest@cctvai.site", AFTER, null)).toBe(false);
  });
});
