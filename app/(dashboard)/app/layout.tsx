import * as React from "react";

import { AppShell } from "@/components/layout/app-shell";

/**
 * Workspace layout.
 *
 * Every authenticated route renders inside the shell, so the sidebar and top
 * bar mount once and survive navigation between pages.
 *
 * The repository list and alert count are provisional: they become
 * `repositoryService.list()` and `alertService.unreadCount()` once the service
 * layer lands in the next phase. They are passed as props rather than read
 * inside the shell so that swap touches one file, not the layout tree.
 */
const PROVISIONAL_REPOSITORIES = [
  { id: "repo_1", name: "acme/payments-api" },
  { id: "repo_2", name: "acme/checkout-web" },
  { id: "repo_3", name: "acme/ledger-core" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell repositories={PROVISIONAL_REPOSITORIES} alertCount={6}>
      {children}
    </AppShell>
  );
}
