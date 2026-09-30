import { describe, expect, it } from "vitest";

import { firstNameFromEmail, nameFromEmail } from "./displayName";

describe("firstNameFromEmail", () => {
  it.each([
    ["nelkit.chavez@gmail.com", "Nelkit"],
    ["maria.jose.bustamante@uts.edu.au", "Maria"],
    ["NELKIT.CHAVEZ@GMAIL.COM", "Nelkit"],
    ["nelkit792@gmail.com", "Nelkit"],
    ["sam+cctv@example.com", "Sam"],
    ["juan_vargas@example.com", "Juan"],
    ["jean-luc.picard@example.com", "Jean-Luc"],
  ])("reads %s as %s", (email, name) => {
    expect(firstNameFromEmail(email)).toBe(name);
  });

  it.each<[string | null, string]>([
    ["l.ortiz@example.com", "an initial is not a name"],
    ["12345@example.com", "no letters at all"],
    ["", "no email"],
    [null, "no user"],
  ])("gives no name for %s (%s)", (email) => {
    expect(firstNameFromEmail(email)).toBeNull();
  });
});

describe("nameFromEmail", () => {
  it("reads the first and second names, the full name and the initials", () => {
    expect(nameFromEmail("nelkit.chavez@gmail.com")).toEqual({
      first: "Nelkit",
      second: "Chavez",
      full: "Nelkit Chavez",
      initials: "NC",
    });
  });

  it("keeps every name in the full name", () => {
    expect(nameFromEmail("maria.jose.bustamante@uts.edu.au")).toEqual({
      first: "Maria",
      second: "Jose",
      full: "Maria Jose Bustamante",
      initials: "MJ",
    });
  });

  it("leaves out what isn't a name, but still draws initials", () => {
    expect(nameFromEmail("l.ortiz@example.com")).toEqual({
      first: null,
      second: "Ortiz",
      full: "Ortiz",
      initials: "LO",
    });
    expect(nameFromEmail("nelkit792@gmail.com")).toEqual({
      first: "Nelkit",
      second: null,
      full: "Nelkit",
      initials: "N",
    });
  });

  it("has nothing to read without an email", () => {
    expect(nameFromEmail(null)).toBeNull();
    expect(nameFromEmail("")).toBeNull();
  });
});
