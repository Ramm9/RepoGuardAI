import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { OnboardingAside } from "@/components/onboarding/onboarding-aside";

export const metadata: Metadata = {
  title: "Set up RepoGuard",
  // Setup is a post-authentication surface with no standalone value; indexing it
  // would only surface a broken, session-less version in search results.
  robots: { index: false, follow: false },
};

/**
 * Onboarding route.
 *
 * A server component wrapping the client flow, so the route can carry metadata
 * and the flow can own its state. `wide` widens the form column to 560px: the
 * repository list and the step-4 analysis stepper both need more measure than a
 * credentials form does.
 *
 * No Suspense boundary is required — unlike /login, nothing here reads search
 * params, so the static shell prerenders.
 */
export default function OnboardingPage() {
  return (
    <AuthLayout wide aside={<OnboardingAside />}>
      <OnboardingFlow />
    </AuthLayout>
  );
}
