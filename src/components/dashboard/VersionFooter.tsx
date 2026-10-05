import { APP_COMMIT, APP_VERSION, releaseUrl, versionLabel } from "@/lib/version";

/** Home's footer: the running version, linked to its GitHub release, and the build. */
export function VersionFooter() {
  return (
    <footer className="text-ink-3 flex items-center justify-center gap-2 pb-6 font-mono text-[11px]">
      <span>CCTV AI Assistant</span>
      <span aria-hidden>·</span>
      <a
        href={releaseUrl(APP_VERSION)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-3 hover:text-accent-strong no-underline transition-colors duration-150"
      >
        {versionLabel(APP_VERSION)}
      </a>
      {APP_COMMIT ? (
        <>
          <span aria-hidden>·</span>
          <span title="Build commit">{APP_COMMIT}</span>
        </>
      ) : null}
    </footer>
  );
}
