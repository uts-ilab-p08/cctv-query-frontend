/** "jean-luc" → "Jean-Luc": each hyphen-joined part capitalized, the rest lowercase. */
const capitalize = (name: string) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-");

/** A segment of the email's local part, as letters only (hyphens kept for compound names). */
const lettersOf = (segment: string) => segment.replace(/[^\p{L}-]/gu, "").replace(/^-+|-+$/g, "");

/** A name needs two letters or more: a single letter is an initial, not a name. */
const asName = (segment: string | undefined) =>
  segment && segment.replace(/-/g, "").length >= 2 ? capitalize(segment) : null;

export interface EmailName {
  /** The first name, e.g. Nelkit; null when the email starts with an initial. */
  first: string | null;
  /** The second name, e.g. Chavez (a surname or a middle name: the email can't tell). */
  second: string | null;
  /** Every name in the email, e.g. Maria Jose Bustamante. */
  full: string | null;
  /** One or two letters for an avatar, e.g. NC. */
  initials: string;
}

/**
 * The names in an email address, for greeting the user and their avatar. The local part
 * is split on "." and "_" (nelkit.chavez@… → Nelkit, Chavez); a "+tag" and digits are
 * ignored, hyphens are kept (jean-luc.picard@… → Jean-Luc). Anything that isn't clearly a
 * name (an initial, no letters) is left out rather than guessed. Null without an email.
 */
export function nameFromEmail(email: string | null | undefined): EmailName | null {
  if (!email) return null;
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  const segments = local.split(/[._]/).map(lettersOf).filter(Boolean);
  const names = segments.map(asName);
  const initials =
    segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("") || email.charAt(0).toUpperCase();

  return {
    first: names[0] ?? null,
    second: names[1] ?? null,
    full: names.filter(Boolean).join(" ") || null,
    initials,
  };
}

/** Just the first name (nelkit.chavez@… → Nelkit), or null. See `nameFromEmail`. */
export function firstNameFromEmail(email: string | null | undefined): string | null {
  return nameFromEmail(email)?.first ?? null;
}
