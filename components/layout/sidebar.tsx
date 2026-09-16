"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronsLeft,
  GitBranch,
  PanelLeft,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";
import { useUIStore, useSidebarCollapsed } from "@/store/ui-store";
import { RepoGuardLogo, RepoGuardMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_WIDTH = 232;
const SIDEBAR_WIDTH_COLLAPSED = 60;

/**
 * Sidebar — persistent workspace navigation.
 *
 * Three states share one implementation: full (232px), collapsed (60px, icons
 * with tooltips), and mobile (an overlay drawer). Only the presentation
 * differs; the same nav items and the same active-route logic drive all three,
 * so a route can never be highlighted in one mode and not another.
 */
export function Sidebar({ alertCount = 6 }: { alertCount?: number }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const toggle = useUIStore((state) => state.toggleSidebar);
  const mobileOpen = useUIStore((state) => state.mobileNavOpen);
  const setMobileOpen = useUIStore((state) => state.setMobileNavOpen);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Trap the drawer open state to Escape and lock body scroll behind it.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, setMobileOpen]);

  const renderNavItem = (item: NavItem, isCollapsed: boolean) => {
    const active = isActiveRoute(pathname, item.href);
    const Icon = item.icon;
    const showBadge = item.badge === "alerts" && alertCount > 0;

    const link = (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md text-[13px]",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          isCollapsed ? "h-9 justify-center px-0" : "h-8 px-2.5",
          active
            ? "bg-elevated font-medium text-foreground"
            : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
        )}
      >
        {/* Active indicator: a 2px accent rail on the leading edge. */}
        {active ? (
          <motion.span
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-accent"
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}

        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors duration-150",
            active ? "text-accent" : "text-faint group-hover:text-muted-foreground",
          )}
          aria-hidden="true"
        />

        {!isCollapsed ? (
          <>
            <span className="truncate">{item.label}</span>
            {showBadge ? (
              <Badge
                variant="critical"
                size="sm"
                className="ml-auto font-mono tabular-nums"
              >
                {alertCount}
              </Badge>
            ) : null}
          </>
        ) : showBadge ? (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 size-1.5 rounded-full bg-risk-critical"
          />
        ) : null}

        {/* Collapsed mode needs a label; the icon alone is ambiguous. */}
        {isCollapsed ? (
          <span className="sr-only">{item.label}</span>
        ) : null}
      </Link>
    );

    if (!isCollapsed) return link;

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const navContent = (isCollapsed: boolean) => (
    <>
      <nav aria-label="Workspace" className="flex flex-1 flex-col gap-0.5 px-2">
        {PRIMARY_NAV.map((item) => renderNavItem(item, isCollapsed))}

        <div className="my-2 px-1">
          <Separator />
        </div>

        {SECONDARY_NAV.map((item) => renderNavItem(item, isCollapsed))}
      </nav>

      {/* Monitoring status — the persistent signal that RepoGuard is live. */}
      <SidebarFooter collapsed={isCollapsed} />
    </>
  );

  return (
    <>
      {/* ---------- Desktop: persistent rail ---------- */}
      <motion.aside
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface md:flex",
        )}
        animate={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
        initial={false}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center px-0" : "justify-between px-3.5",
          )}
        >
          {collapsed ? (
            <Link
              href="/app"
              aria-label="RepoGuard dashboard"
              className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <RepoGuardMark size={20} className="text-accent" />
            </Link>
          ) : (
            <RepoGuardLogo size={20} href="/app" />
          )}

          {!collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggle}
                  aria-label="Collapse sidebar"
                >
                  <ChevronsLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Collapse sidebar
                <kbd className="ml-2 font-mono text-[10px] text-faint">⌘B</kbd>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {navContent(collapsed)}

        {collapsed ? (
          <div className="border-t border-border p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggle}
                  aria-label="Expand sidebar"
                  className="w-full"
                >
                  <PanelLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </motion.aside>

      {/* ---------- Mobile: overlay drawer ---------- */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              aria-label="Sidebar"
              className="fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-surface md:hidden"
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-14 shrink-0 items-center justify-between px-3.5">
                <RepoGuardLogo size={20} href="/app" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X />
                </Button>
              </div>
              {navContent(false)}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Sidebar footer: the GitHub connection and monitoring state.
 *
 * These are the two facts a user needs to trust the data on screen — where it
 * comes from and whether it is still arriving — so they stay visible at the
 * bottom of the rail rather than buried in settings.
 */
function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="shrink-0 border-t border-border">
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1.5 transition-colors duration-150 hover:bg-elevated"
                aria-label="Monitoring active"
              >
                <StatusDot tone="success" pulse />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Monitoring active</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Account: Dana Whitfield"
              >
                <Avatar size="sm">
                  <AvatarImage src={undefined} alt="" />
                  <AvatarFallback seed="dana-whitfield">DW</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Dana Whitfield · GitHub connected</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-center gap-2">
            <StatusDot tone="success" pulse />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Monitoring
            </span>
            <span className="ml-auto font-mono text-[11px] text-faint">3 repos</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarImage src={undefined} alt="" />
              <AvatarFallback seed="dana-whitfield">DW</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight text-foreground">
                Dana Whitfield
              </p>
              <p className="flex items-center gap-1 truncate font-mono text-[11px] text-faint">
                <GitBranch className="size-2.5" aria-hidden="true" />
                @dwhitfield
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Active-route check.
 *
 * `/app` must match exactly or it would light up on every child route; every
 * other route matches its own subtree.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED };
