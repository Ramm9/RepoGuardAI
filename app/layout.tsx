import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

/**
 * Geist for interface text, JetBrains Mono for anything the user reads as code
 * or compares as a value: commit SHAs, file paths, branch names, scores.
 */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RepoGuard — Predictive Software Reliability Platform",
    template: "%s · RepoGuard",
  },
  description:
    "RepoGuard analyzes repository history, code changes, test coverage, complexity, and engineering signals to predict software reliability risk before it reaches production.",
  applicationName: "RepoGuard",
  keywords: [
    "software reliability",
    "regression prediction",
    "code risk analysis",
    "engineering analytics",
    "pull request risk",
  ],
  openGraph: {
    title: "RepoGuard — Predictive Software Reliability Platform",
    description:
      "Know which commits will break your software before they do.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-canvas antialiased">
        {/* Keyboard users land here first; visible only on focus. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:border-accent/50 focus:bg-elevated focus:px-3 focus:py-2 focus:text-[13px] focus:text-foreground"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
