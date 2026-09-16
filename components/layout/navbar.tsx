"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "motion/react";
import { Github, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { MARKETING_NAV } from "@/lib/navigation";
import { RepoGuardLogo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/**
 * MarketingNavbar — the public site header.
 *
 * Transparent over the hero, then acquires a surface and a hairline border once
 * the page has scrolled past the fold. The transition is a class swap rather
 * than an animated backdrop, which keeps it cheap and avoids a blurry band
 * during the change.
 */
export function MarketingNavbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Flip once, at a threshold, instead of on every scroll frame.
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 12);
  });

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        scrolled
          ? "border-b border-border bg-canvas/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6">
        <RepoGuardLogo size={22} />

        <nav
          aria-label="Main"
          className="ml-2 hidden items-center gap-1 md:flex"
        >
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-[13px] transition-colors duration-150",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="RepoGuard on GitHub"
            >
              <Github />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/signup">Connect GitHub</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border bg-canvas/95 backdrop-blur-md md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-6 py-4">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-elevated hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
                <Button variant="outline" size="md" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="primary" size="md" asChild>
                  <Link href="/signup">Connect GitHub</Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

/**
 * MarketingFooter — three link columns plus the product signature.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1280px] px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <RepoGuardLogo size={22} />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Predict software reliability risk from repository history, code
              changes, and engineering signals — before it reaches production.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-faint">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-faint">© 2026 RepoGuard</p>
          <p className="font-mono text-xs text-faint">
            Predictive Software Reliability Platform
          </p>
        </div>
      </div>
    </footer>
  );
}

const FOOTER_COLUMNS = [
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
      { label: "API", href: "/architecture#api" },
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
