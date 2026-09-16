import { API_BASE_URL, USE_MOCK_DATA } from "./config";
import { ApiError, messageForStatus, toApiError } from "./errors";

export type QueryValue = string | number | boolean | undefined | null | string[];

/** Append defined query parameters to a path, skipping empty values. */
export function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(
    path.startsWith("http") ? path : `${API_BASE_URL}${path}`,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        url.searchParams.set(key, value.join(","));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Parse a DRF error body into our normalized shape. DRF returns either
 * `{ detail: "..." }` or a field->messages map; both are handled, and neither
 * is ever shown to the user verbatim unless it is the `detail` string.
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  let detail: string | undefined;
  let code = `http_${response.status}`;
  let fieldErrors: Record<string, string[]> | undefined;

  try {
    const body = await response.json();

    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (typeof body?.message === "string") {
      detail = body.message;
    }

    if (typeof body?.code === "string") {
      code = body.code;
    }

    if (body && typeof body === "object" && !Array.isArray(body)) {
      const entries = Object.entries(body).filter(
        ([key, value]) =>
          key !== "detail" &&
          key !== "message" &&
          key !== "code" &&
          (Array.isArray(value) || typeof value === "string"),
      );

      if (entries.length > 0) {
        fieldErrors = Object.fromEntries(
          entries.map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map(String) : [String(value)],
          ]),
        );
      }
    }
  } catch {
    // Body was empty or not JSON — fall back to status-based copy.
  }

  // A lapsed GitHub credential is a first-class state with its own recovery UI.
  const requiresReauth =
    response.status === 401 ||
    code === "github_token_expired" ||
    code === "github_unauthorized";

  return new ApiError({
    status: response.status,
    code,
    message: detail ?? messageForStatus(response.status),
    fieldErrors,
    requiresReauth,
  });
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryValue>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * The single point through which every backend call flows.
 *
 * GitHub credentials never pass through here — the browser holds only the
 * RepoGuard session cookie, and all privileged GitHub operations happen
 * server-side in Django.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, signal, headers } = options;

  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: options.cache,
      next: options.next,
      signal,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // 204 No Content and empty 200s are legitimate for DELETE and job kicks.
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export { USE_MOCK_DATA, API_BASE_URL };
