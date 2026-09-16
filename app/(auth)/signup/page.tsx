import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpAside } from "@/components/auth/auth-aside";
import { SignUpForm } from "@/components/auth/sign-up-form";

/**
 * /signup
 *
 * No Suspense boundary here, unlike /login: this form reads no search params, so
 * the route prerenders and only the form itself hydrates.
 */
export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a RepoGuard account and connect a repository to get its first risk analysis.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthLayout aside={<SignUpAside />}>
      <SignUpForm />
    </AuthLayout>
  );
}
