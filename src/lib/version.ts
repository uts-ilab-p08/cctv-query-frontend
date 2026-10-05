// The running build's version, injected by next.config.ts (see build-info.ts). Read
// with direct `process.env.NEXT_PUBLIC_*` access: Next inlines only that exact form.

/** Semver from `package.json`; each release is the git tag `v<version>`. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

/** Short commit of this build, or null where the build had no git info. */
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT || null;

const REPO_URL = "https://github.com/uts-ilab-p08/cctv-query-frontend";

/** A version as its git tag names it: `1.4.2` → `v1.4.2`. */
export function versionLabel(version: string): string {
  return `v${version}`;
}

/** The GitHub release for a version (created by .github/workflows/release.yml). */
export function releaseUrl(version: string): string {
  return `${REPO_URL}/releases/tag/${versionLabel(version)}`;
}
