import { LandingPage } from "@/components/landing/LandingPage";
import { checkGuestCode, GUEST_PARAM } from "@/lib/guestAccess";

interface HomeProps {
  searchParams: Promise<{ [GUEST_PARAM]?: string | string[] }>;
}

/** Opened from the showcase QR code (`/?guest=<code>`), the landing's Sign in links sign the
 *  visitor in as a guest. Only a current code changes them; /auth/guest checks it again. */
export default async function Home({ searchParams }: HomeProps) {
  const { [GUEST_PARAM]: param } = await searchParams;
  const code = Array.isArray(param) ? param[0] : param;
  const signInHref =
    code && checkGuestCode(code) === "valid"
      ? `/auth/guest?code=${encodeURIComponent(code)}`
      : "/login";
  return <LandingPage signInHref={signInHref} />;
}
