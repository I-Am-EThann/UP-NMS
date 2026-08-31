import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL, SEVERITY_ORDER, zoneAlertTotal } from "@/lib/stats";
import { Zone } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";

const badgeVariantByLevel = {
  critical: "critical",
  major: "major",
  warning: "warning",
  normal: "normal",
} as const;

export function ZoneAlertTable({ zones }: { zones: Zone[] }) {
  const { t } = useLocale();

  return (
    <div className="divide-y divide-border-subtle">
      {zones.map((zone) => (
        <Link
          key={zone.id}
          href={`/zones/${zone.id}`}
          className="flex flex-col gap-2 py-3 transition-colors hover:bg-brand-50/60 -mx-1 px-1 rounded-md sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">
              {zone.name}
            </p>
            <p className="font-mono text-[11px] text-ink-400">
              {t.zonesPage.deviceSummary(zone.switchCount, zone.accessPointCount)} ·{" "}
              {t.alerts.countSuffix(zoneAlertTotal(zone))}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {SEVERITY_ORDER.map((level) => {
              const count = zone.alertCounts[level];
              if (count === 0) return null;
              return (
                <Badge key={level} variant={badgeVariantByLevel[level]}>
                  {SEVERITY_LABEL[level]} {count}
                </Badge>
              );
            })}
            <ChevronRight className="size-4 text-ink-400" />
          </div>
        </Link>
      ))}
    </div>
  );
}
