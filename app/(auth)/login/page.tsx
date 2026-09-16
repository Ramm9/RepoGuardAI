import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInAside } from "@/components/auth/auth-aside";
import { SignInForm } from "@/components/auth/sign-in-form";
import { FormSkeleton } from "@/components/auth/form-skeleton";

/**
 * /login
 *
 * A server component so the route can export metadata and ship no client
 * JavaScript of its own. The form is a client child wrapped in Suspense, which
 * is what `useSearchParams` requires to keep this route statically prerenderable.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to RepoGuard to review repository risk and analysis.",
  // Sign-in pages are noise in search results and are never a landing page.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthLayout aside={<SignInAside />}>
      <Suspense fallback={<FormSkeleton />}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
