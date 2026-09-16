import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileWarning,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/** A single entry in the primary navigation. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rendered as a count or status chip on the right of the row. */
  badge?: "alerts";
  /** Marks the item as still being built, shown with a muted style. */
  comingSoon?: boolean;
}

/** Primary workspace navigation. Order is deliberate: overview → forensics →
 *  aggregate → response → administration. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Repositories", href: "/app/repositories", icon: GitBranch },
  { label: "Commits", href: "/app/commits", icon: GitCommitHorizontal },
  { label: "Pull Requests", href: "/app/pull-requests", icon: GitPullRequest },
  { label: "Risk Hotspots", href: "/app/hotspots", icon: FileWarning },
  { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { label: "Alerts", href: "/app/alerts", icon: AlertTriangle, badge: "alerts" },
  { label: "Team", href: "/app/team", icon: Users },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Settings", href: "/app/settings", icon: Settings },
];

/** Marketing site navigation, shared by the navbar and the footer. */
export const MARKETING_NAV = [
  { label: "Product", href: "/#product" },
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Architecture", href: "/architecture" },
] as const;

export const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Architecture", href: "/architecture" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "GitHub", href: "https://github.com" },
      { label: "API Reference", href: "/architecture#api" },
      { label: "Documentation", href: "/how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Contact", href: "/#contact" },
      { label: "Security", href: "/architecture#security" },
    ],
  },
] as const;

/** Groups used by the command palette, in priority order. */
export const COMMAND_GROUPS = ["Navigate", "Repositories", "Recent", "Actions"] as const;

export type CommandGroup = (typeof COMMAND_GROUPS)[number];

export const ICON_BY_KIND = {
  commit: GitCommitHorizontal,
  pull_request: GitPullRequest,
  hotspot: FileWarning,
  health: Activity,
  alert: AlertTriangle,
  analysis: Activity,
} as const;
