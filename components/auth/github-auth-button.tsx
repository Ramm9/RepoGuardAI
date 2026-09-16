"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";

import { cn } from "@/lib/utils";
import { USE_MOCK_DATA } from "@/lib/api/client";
import { connectGitHubMock, githubAuthorizeUrl } from "@/services/auth";
import { Button } from "@/components/ui/button";

/**
 * GitHubAuthButton — the primary action on both auth screens.
 *
 * In a live build the rendered control is a real anchor, not a button whose
 * onClick builds a URL. That matters: navigation to an external identity
 * provider has to survive a blocked script, and a link can be middle-clicked.
 * The only reason this component holds state at all is the mock build, where
 * there is no GitHub round trip to perform and the result must be faked in place.
 *
 * `href` points at the RepoGuard backend, never at github.com — the client ID,
 * the signed state parameter, and the authorization-code exchange all belong to
 * Django (see services/auth.ts).
 */
export function GitHubAuthButton({
  label = "Continue with GitHub",
  next = "/onboarding",
  size = "lg",
  className,
}: {
  label?: string;
  /** Where the backend should send the user once connected. */
  next?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleMockConnect() {
    setPending(true);
    try {
      await connectGitHubMock();
      router.push(next);
    } finally {
      setPending(false);
    }
  }

  if (USE_MOCK_DATA) {
    return (
      <Button
        type="button"
        variant="primary"
        size={size}
        loading={pending}
        onClick={handleMockConnect}
        className={cn("w-full", className)}
      >
        {pending ? null : <Github aria-hidden="true" />}
        {pending ? "Waiting for GitHub…" : label}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size={size}
      asChild
      className={cn("w-full", className)}
    >
      <a href={githubAuthorizeUrl(next)}>
        <Github aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

/**
 * RequestedScopes — the permission list shown under the GitHub action.
 *
 * Reading the scopes before granting them is the difference between an install
 * the user consented to and one they merely tolerated. These are the real values
 * the GitHub App requests: read-only, with no write scope of any kind.
 */
export function RequestedScopes({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1.5", className)}>
      {SCOPES.map((scope) => (
        <li key={scope} className="font-mono text-[11px] text-faint">
          {scope}
        </li>
      ))}
    </ul>
  );
}

const SCOPES = ["contents:read", "metadata:read", "pull_requests:read"] as const;
