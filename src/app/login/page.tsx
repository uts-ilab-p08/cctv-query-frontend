import type { Metadata } from "next";

import { LoginScreen } from "@/components/login/LoginScreen";
import { GUEST_PARAM } from "@/lib/guestAccess";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Horus query workspace.",
  alternates: { canonical: "/login" },
};

/** Why /auth/guest sent the visitor here instead of the dashboard. */
const GUEST_NOTICES: Record<string, string> = {
  expired: "This guest link has expired. Sign in with a project account to continue.",
  invalid: "This guest link isn't valid. Sign in with a project account to continue.",
  unavailable: "Guest access isn't available right now. Please try again in a moment.",
};

interface LoginPageProps {
  searchParams: Promise<{ [GUEST_PARAM]?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { [GUEST_PARAM]: reason } = await searchParams;
  const notice = typeof reason === "string" ? GUEST_NOTICES[reason] : undefined;
  return <LoginScreen notice={notice} />;
}
