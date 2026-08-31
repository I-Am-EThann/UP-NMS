"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTitleProvider } from "@/lib/page-title-context";
import { NetworkDataProvider } from "@/lib/network-data-context";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes, keyed by pathname
  // so it resets without reaching for an effect that sets state.
  const [lastPathname, setLastPathname] = React.useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (sidebarOpen) setSidebarOpen(false);
  }

  return (
    <NetworkDataProvider>
      <PageTitleProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </PageTitleProvider>
    </NetworkDataProvider>
  );
}
