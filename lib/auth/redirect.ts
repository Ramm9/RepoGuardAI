/**
 * Post-authentication navigation helpers.
 */

/**
 * Resolve a `?next=` parameter to a safe same-origin path.
 *
 * Without this check, `/login?next=https://evil.example` would turn the login
 * page into an open redirect — the user authenticates against the real RepoGuard
 * and is then handed to an attacker's clone of it, already carrying the trust of
 * having just signed in. Only an absolute path on this origin is accepted;
 * protocol-relative (`//evil.example`) and schemed (`https:`, `javascript:`)
 * values are discarded, as is anything that is not a string starting with "/".
 */
export function safeNextPath(value: string | null, fallback = "/app"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  // "//host" and "/\host" are treated by browsers as protocol-relative URLs.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
