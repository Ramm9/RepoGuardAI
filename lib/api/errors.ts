import type { ApiErrorShape } from "@/types";

/**
 * Every non-2xx response and network failure surfaces as this class, so the UI
 * can render a meaningful message instead of a raw stack or status code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requiresReauth: boolean;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.status = shape.status;
    this.code = shape.code;
    this.fieldErrors = shape.fieldErrors;
    this.requiresReauth = shape.requiresReauth ?? false;
  }

  /** True when the failure is transient and a retry is reasonable. */
  get isTransient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/** Normalise any thrown value into an ApiError for consistent handling. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof Error) {
    return new ApiError({
      status: 0,
      code: "network_error",
      message:
        "We couldn't reach the RepoGuard API. Check your connection and try again.",
    });
  }

  return new ApiError({
    status: 0,
    code: "unknown_error",
    message: "Something went wrong. Please try again.",
  });
}

/**
 * Default user-facing copy per HTTP status. The backend may override `message`;
 * when it doesn't, this prevents raw status text reaching the screen.
 */
export function messageForStatus(status: number): string {  switch (status) {
    case 400:
      return "That request wasn't valid. Review the highlighted fields and try again.";
    case 401:
      return "Your session has expired. Sign in again to continue.";
    case 403:
      return "You don't have permission to view this. Ask a repository owner for access.";
    case 404:
      return "We couldn't find what you were looking for. It may have been removed.";
    case 409:
      return "That change conflicts with something else. Refresh and try again.";
    case 429:
      return "Too many requests. RepoGuard is rate limiting to stay responsive — try again shortly.";
    default:
      if (status >= 500) {
        return "RepoGuard hit an unexpected error on the server. The team has been notified.";
      }
      return "Something went wrong. Please try again.";
  }
}

/**
 * User-facing copy for a caught value, for form-level error banners.
 *
 * Prefers the API's own message — DRF is the only layer that knows *why* a
 * request failed — and falls back to a caller-supplied sentence for anything
 * that never reached the API at all.
 */
export function messageFromError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

/**
 * Map a DRF field-error map onto a form library's setError callback.
 *
 * Keeps the "which input do I mark?" decision in one place: a 400 naming `email`
 * marks that field rather than dumping a generic banner over the whole form.
 * Fields the form doesn't know about are returned so the caller can surface them
 * at form level instead of silently dropping them.
 */
export function applyFieldErrors(
  error: unknown,
  knownFields: readonly string[],
  setError: (field: string, message: string) => void,
): string[] {
  if (!(error instanceof ApiError) || !error.fieldErrors) return [];

  const unmatched: string[] = [];

  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const message = messages[0];
    if (!message) continue;

    if (knownFields.includes(field)) {
      setError(field, message);
    } else {
      unmatched.push(message);
    }
  }

  return unmatched;
}
