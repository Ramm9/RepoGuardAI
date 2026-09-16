import { api, USE_MOCK_DATA } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { mockDelay } from "@/lib/mock/latency";
import {
  DISCONNECTED_GITHUB,
  MOCK_GITHUB_CONNECTION,
  MOCK_USER,
} from "@/lib/mock/account";
import type { GitHubConnection, User } from "@/types";
import type { SignInInput, SignUpInput } from "@/lib/validation/auth";

/**
 * Authentication service.
 *
 * Every component talks to this module, never to `fetch` or to a mock fixture
 * directly. Swapping NEXT_PUBLIC_USE_MOCK_DATA to "false" routes the exact same
 * calls at the Django API with no change anywhere in the component tree — which
 * is the whole point of the indirection.
 *
 * SECURITY
 * --------
 * The browser never holds a GitHub credential. Sign-in returns a RepoGuard
 * session cookie set by Django (httpOnly, SameSite=Lax); the GitHub App
 * installation token is created and stored server-side and is never serialized
 * into any response this layer can see. `githubAuthorizeUrl()` deliberately
 * points at *our* backend rather than at github.com/login/oauth/authorize: the
 * client ID, the secret, the state parameter, and the code exchange all live on
 * the Django side. There is no code path here that could leak a token, because
 * there is no code path here that ever receives one.
 */

export interface Session {
  user: User;
  github: GitHubConnection;
}

/* -------------------------------------------------------------------------- */
/*  Credentials                                                                */
/* -------------------------------------------------------------------------- */

export async function signIn(input: SignInInput): Promise<Session> {
  if (USE_MOCK_DATA) {
    await mockDelay();

    // One rejecting account so the error path is reachable in the mock build.
    if (input.email.toLowerCase() === "locked@repoguard.dev") {
      throw new ApiError({
        status: 401,
        code: "invalid_credentials",
        message: "That email and password combination doesn't match an account.",
      });
    }

    return { user: MOCK_USER, github: MOCK_GITHUB_CONNECTION };
  }

  return api.post<Session>("/auth/login/", {
    email: input.email,
    password: input.password,
    remember: input.remember,
  });
}

export async function signUp(input: SignUpInput): Promise<Session> {
  if (USE_MOCK_DATA) {
    await mockDelay();

    if (input.email.toLowerCase() === "taken@repoguard.dev") {
      throw new ApiError({
        status: 400,
        code: "email_taken",
        message: "An account already uses that email address.",
        fieldErrors: { email: ["An account already uses that email address."] },
      });
    }

    // A new account has no GitHub installation yet — that is onboarding's job.
    return {
      user: { ...MOCK_USER, name: input.name, email: input.email },
      github: DISCONNECTED_GITHUB,
    };
  }

  return api.post<Session>("/auth/register/", {
    name: input.name,
    email: input.email,
    password: input.password,
  });
}

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(150);
    return;
  }
  await api.post<void>("/auth/logout/");
}

/* -------------------------------------------------------------------------- */
/*  GitHub connection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Where to send the browser to begin a GitHub App installation.
 *
 * This is a backend route, not github.com. Django owns the client ID, signs the
 * `state` parameter, exchanges the code, and redirects back to `next` once the
 * installation token is stored. The frontend's entire role is navigation.
 */
export function githubAuthorizeUrl(next: string = "/onboarding"): string {
  const url = new URL(`${API_BASE_URL}/auth/github/start/`);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function getGitHubConnection(): Promise<GitHubConnection> {
  if (USE_MOCK_DATA) {
    await mockDelay(250);
    return MOCK_GITHUB_CONNECTION;
  }
  return api.get<GitHubConnection>("/auth/github/");
}

/**
 * Mock-only: simulate returning from the GitHub authorization screen.
 *
 * In a live build the browser leaves the app entirely and comes back to a
 * backend redirect, so there is nothing for the frontend to "connect".
 */
export async function connectGitHubMock(): Promise<GitHubConnection> {
  await mockDelay(900);
  return MOCK_GITHUB_CONNECTION;
}
