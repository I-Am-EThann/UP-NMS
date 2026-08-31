"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  LayoutDashboard,
  MapPinned,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { ZoneFormDialog } from "@/components/zones/zone-form-dialog";

function NavLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-brand-200/80 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { zones } = useNetworkData();
  const { t } = useLocale();
  const [addZoneOpen, setAddZoneOpen] = React.useState(false);

  return (
    <>
      {/* Backdrop — mobile only, closes the drawer */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] shrink-0 flex-col bg-brand-950 text-white transition-transform duration-200",
          "lg:relative lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="signal-dot text-brand-500">
              <Radio className="size-5 text-brand-200" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">UP NMS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-brand-200/60 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label={t.sidebar.closeMenuAria}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <div className="space-y-1">
            <NavLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              onNavigate={onClose}
            >
              <LayoutDashboard className="size-4" />
              {t.sidebar.overviewLink}
            </NavLink>
          </div>

          <div className="mt-6 flex items-center justify-between px-3">
            <Link
              href="/zones"
              onClick={onClose}
              className={cn(
                "font-mono text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-white",
                pathname === "/zones" ? "text-white" : "text-brand-200/60"
              )}
            >
              {t.sidebar.zonesLabel}
            </Link>
            <button
              type="button"
              onClick={() => setAddZoneOpen(true)}
              className="rounded p-1 text-brand-200/60 transition-colors hover:bg-white/5 hover:text-white"
              aria-label={t.sidebar.addZoneAria}
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="mt-1 space-y-1">
            {zones.map((zone) => {
              const zoneHref = `/zones/${zone.id}`;
              const isActive = pathname.startsWith(zoneHref);
              const hasAlerts =
                zone.alertCounts.critical > 0 || zone.alertCounts.major > 0;
              return (
                <NavLink
                  key={zone.id}
                  href={zoneHref}
                  active={isActive}
                  onNavigate={onClose}
                >
                  <MapPinned className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{zone.name}</span>
                  {hasAlerts && (
                    <span
                      className={cn(
                        "signal-dot signal-dot--fast size-1.5 rounded-full",
                        zone.alertCounts.critical > 0
                          ? "bg-sev-critical text-sev-critical"
                          : "bg-sev-major text-sev-major"
                      )}
                    />
                  )}
                </NavLink>
              );
            })}
            {zones.length === 0 && (
              <p className="px-3 py-2 text-xs text-brand-200/50">
                {t.sidebar.noZones}
              </p>
            )}
          </div>
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="font-mono text-[11px] text-brand-200/50">
            v0.8.0 — Sprint 8
          </p>
        </div>

        <ZoneFormDialog
          open={addZoneOpen}
          onOpenChange={setAddZoneOpen}
          mode="create"
        />
      </aside>
    </>
  );
}
