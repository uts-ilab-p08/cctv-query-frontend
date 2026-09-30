import type { Metadata } from "next";

import { LoginScreen } from "@/components/login/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the CCTV AI query workspace.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginScreen />;
}
