import { daysBeforeEpoch, minutesBeforeEpoch, randomFor, randomInt } from "./seed";
import type {
  AvailableRepository,
  GitHubConnection,
  OnboardingState,
  User,
} from "@/types";

/**
 * Account and onboarding fixtures.
 *
 * Shapes here mirror the Django serializers exactly, so services/auth.ts can
 * swap `USE_MOCK_DATA` off and return live responses without a single component
 * changing. Timestamps are anchored to FIXTURE_EPOCH and shifted at read time.
 *
 * Note what is deliberately absent: there is no token, no client secret, and no
 * GitHub credential of any kind in this file. The mock models what the browser
 * is allowed to know, which is a boolean and a username — the installation
 * token lives on the backend and never crosses the wire.
 */

export const MOCK_USER: User = {
  id: "usr_8f2c41",
  name: "Dev Anasriram",
  email: "dev@repoguard.dev",
  avatarUrl: null,
  githubUsername: "danasriram",
  createdAt: daysBeforeEpoch(214),
};

export const MOCK_GITHUB_CONNECTION: GitHubConnection = {
  connected: true,
  username: "danasriram",
  avatarUrl: null,
  scopes: ["contents:read", "metadata:read", "pull_requests:read"],
  connectedAt: daysBeforeEpoch(214),
  expired: false,
};

export const DISCONNECTED_GITHUB: GitHubConnection = {
  connected: false,
  username: null,
  avatarUrl: null,
  scopes: [],
  connectedAt: null,
  expired: false,
};

export const EMPTY_ONBOARDING: OnboardingState = {
  connectGitHub: false,
  selectRepository: false,
  selectBranch: false,
  initialAnalysis: false,
  completedAt: null,
};

/* -------------------------------------------------------------------------- */
/*  Repositories available to connect                                          */
/* -------------------------------------------------------------------------- */

interface RepoSeed {
  name: string;
  owner: string;
  description: string;
  language: string;
  visibility: AvailableRepository["visibility"];
  defaultBranch: string;
  branches: string[];
  /** Days since the last commit, before the fixture epoch. */
  lastCommitDays: number;
}

const REPO_SEEDS: RepoSeed[] = [
  {
    name: "payments-api",
    owner: "acme",
    description: "Payment orchestration, settlement, and ledger services.",
    language: "Python",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "release/2026.3", "develop"],
    lastCommitDays: 0,
  },
  {
    name: "checkout-web",
    owner: "acme",
    description: "Customer-facing checkout and payment method management.",
    language: "TypeScript",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "next", "release/q3"],
    lastCommitDays: 0,
  },
  {
    name: "ledger-core",
    owner: "acme",
    description: "Double-entry ledger engine and reconciliation jobs.",
    language: "Go",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "develop"],
    lastCommitDays: 1,
  },
  {
    name: "fraud-signals",
    owner: "acme",
    description: "Feature extraction and scoring for transaction fraud models.",
    language: "Python",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "experiments"],
    lastCommitDays: 2,
  },
  {
    name: "infra-terraform",
    owner: "acme",
    description: "Cloud infrastructure, networking, and deployment modules.",
    language: "HCL",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "staging"],
    lastCommitDays: 4,
  },
  {
    name: "design-system",
    owner: "acme",
    description: "Shared React component library and design tokens.",
    language: "TypeScript",
    visibility: "public",
    defaultBranch: "main",
    branches: ["main", "v3"],
    lastCommitDays: 6,
  },
  {
    name: "notification-service",
    owner: "acme",
    description: "Email, SMS, and webhook delivery with retry semantics.",
    language: "Java",
    visibility: "private",
    defaultBranch: "main",
    branches: ["main", "develop"],
    lastCommitDays: 9,
  },
  {
    name: "docs-site",
    owner: "acme",
    description: "Public API documentation and integration guides.",
    language: "MDX",
    visibility: "public",
    defaultBranch: "main",
    branches: ["main"],
    lastCommitDays: 15,
  },
];

export const AVAILABLE_REPOSITORIES: AvailableRepository[] = REPO_SEEDS.map(
  (seed) => {
    const random = randomFor(`${seed.owner}/${seed.name}`);
    const lastCommitAt =
      seed.lastCommitDays === 0
        ? minutesBeforeEpoch(randomInt(random, 8, 280))
        : daysBeforeEpoch(seed.lastCommitDays);

    return {
      id: `repo_${seed.name}`,
      name: seed.name,
      fullName: `${seed.owner}/${seed.name}`,
      owner: seed.owner,
      description: seed.description,
      language: seed.language,
      visibility: seed.visibility,
      defaultBranch: seed.defaultBranch,
      stars: randomInt(random, 0, 480),
      openIssues: randomInt(random, 0, 64),
      lastCommitAt,
      updatedAt: lastCommitAt,
      monitoring: "pending",
    };
  },
);

/** Branch list for a repository, in the order GitHub would return them. */
export function branchesFor(repositoryId: string): string[] {
  const seed = REPO_SEEDS.find((entry) => `repo_${entry.name}` === repositoryId);
  return seed ? seed.branches : ["main"];
}
