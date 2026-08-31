"use client";

import Link from "next/link";
import { Router, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertItem } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";

const badgeVariantByLevel = {
  critical: "critical",
  major: "major",
  warning: "warning",
  normal: "normal",
} as const;

export function AlertList({
  alerts,
  showZone = false,
  emptyLabel,
}: {
  alerts: AlertItem[];
  showZone?: boolean;
  emptyLabel?: string;
}) {
  const { t, intlTag } = useLocale();

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(intlTag, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-400">
        {emptyLabel ?? t.alerts.noAlerts}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          href={`/zones/${alert.zoneId}/${
            alert.deviceKind === "switch" ? "switches" : "access-points"
          }/${alert.deviceId}`}
          className="-mx-1 flex flex-col gap-2 rounded-md px-1 py-3 transition-colors hover:bg-brand-50/60 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-brand-700">
              {alert.deviceKind === "switch" ? (
                <Router className="size-4" />
              ) : (
                <Wifi className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">
                {alert.deviceName}
                {showZone && (
                  <span className="ml-1.5 font-normal text-ink-400">
                    · {alert.zoneName}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-ink-600">
                {t.alertMessages[alert.messageKey]}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
            <Badge variant={badgeVariantByLevel[alert.severity]}>
              {alert.severity}
            </Badge>
            <span className="font-mono text-[11px] text-ink-400">
              {formatTime(alert.createdAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
