"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  GitBranch,
  Menu,
  Search,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { RepoGuardMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * TopBar — the workspace's global control strip.
 *
 * Fixed at 56px so every page's content begins at the same y-offset. Contents
 * are ordered by how often they are reached for: repository scope, search,
 * command palette, then status and account.
 */
export function TopBar({
  repositories = [],
  alertCount = 6,
}: {
  repositories?: { id: string; name: string }[];
  alertCount?: number;
}) {
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const activeRepositoryId = useUIStore((state) => state.activeRepositoryId);
  const setActiveRepositoryId = useUIStore((state) => state.setActiveRepositoryId);

  const activeRepository =
    repositories.find((repo) => repo.id === activeRepositoryId) ?? null;

  // Detect the platform once so the shortcut hint reads correctly.
  const [modifierKey, setModifierKey] = React.useState("⌘");
  React.useEffect(() => {
    if (typeof navigator !== "undefined" && !/Mac|iPhone|iPad/.test(navigator.platform)) {
      setModifierKey("Ctrl");
    }
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2",
        "border-b border-border bg-canvas/85 px-3 backdrop-blur-md sm:px-4",
      )}
    >
      {/* Mobile: navigation trigger. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <Link
        href="/app"
        className="md:hidden"
        aria-label="RepoGuard dashboard"
      >
        <RepoGuardMark size={20} className="text-accent" />
      </Link>

      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />

      {/* ---- Repository scope selector ---- */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5",
              "text-[13px] text-foreground transition-colors duration-150",
              "hover:border-border-strong hover:bg-elevated",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-label="Select repository scope"
          >
            <GitBranch className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
            <span className="max-w-[9rem] truncate font-mono text-xs sm:max-w-[14rem]">
              {activeRepository ? activeRepository.name : "All repositories"}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Repository scope</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => setActiveRepositoryId(null)}
            className="font-mono text-xs"
          >
            All repositories
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {repositories.length === 0 ? (
            <DropdownMenuItem disabled>No repositories connected</DropdownMenuItem>
          ) : (
            repositories.map((repo) => (
              <DropdownMenuItem
                key={repo.id}
                onSelect={() => setActiveRepositoryId(repo.id)}
                className="font-mono text-xs"
              >
                {repo.name}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app/repositories" className="font-sans">
              Manage repositories
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ---- Search ---- */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className={cn(
          "group ml-auto hidden h-8 min-w-[13rem] max-w-sm flex-1 items-center gap-2 rounded-md",
          "border border-border bg-surface px-2.5 text-left",
          "text-[13px] text-faint transition-colors duration-150",
          "hover:border-border-strong hover:bg-elevated",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "lg:flex",
        )}
        aria-label="Search repositories, commits, and pull requests"
      >
        <Search className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">Search commits, PRs, files…</span>
        <kbd
          className={cn(
            "ml-auto shrink-0 rounded-sm border border-border bg-elevated",
            "px-1.5 py-0.5 font-mono text-[10px] text-faint",
          )}
        >
          {modifierKey}K
        </kbd>
      </button>

      {/* ---- Compact actions ---- */}
      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <Search />
        </Button>

        {/* GitHub delivery health — the provenance signal for all this data. */}
        <div
          className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-8 sm:flex"
          title="GitHub webhook delivery is healthy"
        >
          <StatusDot tone="success" pulse />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            GitHub
          </span>
        </div>

        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/app/alerts" aria-label={`Alerts, ${alertCount} unread`} className="relative">
            <Bell />
            {alertCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-risk-critical ring-2 ring-canvas"
              />
            ) : null}
          </Link>
        </Button>

        <AccountMenu alertCount={alertCount} />
      </div>
    </header>
  );
}

function AccountMenu({ alertCount }: { alertCount: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Account menu"
        >
          <Avatar size="sm">
            <AvatarImage src={undefined} alt="" />
            <AvatarFallback seed="dana-whitfield">DW</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar size="md">
            <AvatarImage src={undefined} alt="" />
            <AvatarFallback seed="dana-whitfield">DW</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[13px] leading-tight text-foreground">
              Dana Whitfield
            </p>
            <p className="truncate font-mono text-[11px] text-faint">
              @dwhitfield
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings#github">
            <GitBranch />
            GitHub connection
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/alerts">
            <Bell />
            Alerts
            {alertCount > 0 ? (
              <DropdownMenuShortcut>
                <Badge variant="critical" size="sm" className="font-mono">
                  {alertCount}
                </Badge>
              </DropdownMenuShortcut>
            ) : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
