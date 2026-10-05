// Build-time version info for next.config.ts, which exposes it to the app as env. Kept
// out of the client bundle: only the two strings it returns reach the browser.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** `package.json` → `version`: bumped by `npm version`, which also tags `vX.Y.Z`. Read from
 *  the working directory (the project root for `next` and `vitest`): next.config.ts is
 *  compiled to CommonJS, where `import.meta.url` is not available. */
export function readAppVersion(): string {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    version: string;
  };
  return pkg.version;
}

/** The short commit being built: from the host's env when it has one (Vercel, GitHub
 *  Actions), else from git; empty when neither is available. */
export function readAppCommit(): string {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}
