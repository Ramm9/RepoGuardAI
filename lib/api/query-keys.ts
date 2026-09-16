/**
 * Query key factory.
 *
 * Every TanStack Query key in the application is built here rather than written
 * inline at the call site. Two reasons: invalidation needs a prefix it can trust
 * (`queryClient.invalidateQueries({ queryKey: keys.repositories.all })` has to
 * match every repository query, including ones added later), and a typo in an
 * inline key produces a silent cache miss rather than an error.
 *
 * Keys are arrays ordered general → specific, so a prefix invalidation always
 * catches its descendants.
 */
export const keys = {
  session: ["session"] as const,

  github: {
    all: ["github"] as const,
    connection: () => [...keys.github.all, "connection"] as const,
    repositories: (search?: string) =>
      [...keys.github.all, "repositories", search ?? ""] as const,
    branches: (repositoryId: string) =>
      [...keys.github.all, "branches", repositoryId] as const,
  },

  repositories: {
    all: ["repositories"] as const,
    list: (params?: Record<string, unknown>) =>
      [...keys.repositories.all, "list", params ?? {}] as const,
    detail: (id: string) => [...keys.repositories.all, "detail", id] as const,
    health: (id: string) => [...keys.repositories.all, "health", id] as const,
  },

  analysis: {
    all: ["analysis"] as const,
    job: (id: string) => [...keys.analysis.all, "job", id] as const,
  },
} as const;
