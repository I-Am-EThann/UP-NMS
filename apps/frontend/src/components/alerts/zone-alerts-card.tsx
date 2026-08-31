"use client";

import * as React from "react";
import { AlertItem, SeverityLevel } from "@/lib/types";
import { sortAlerts } from "@/lib/stats";
import { useLocale } from "@/lib/i18n/locale-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityFilterPills } from "@/components/alerts/severity-filter-pills";
import { AlertList } from "@/components/alerts/alert-list";

export function ZoneAlertsCard({ alerts }: { alerts: AlertItem[] }) {
  const { t } = useLocale();
  const [filter, setFilter] = React.useState<SeverityLevel | "all">("all");

  const counts: Record<SeverityLevel, number> = {
    critical: 0,
    major: 0,
    warning: 0,
    normal: 0,
  };
  for (const alert of alerts) counts[alert.severity] += 1;

  const sorted = sortAlerts(alerts);
  const filtered = filter === "all" ? sorted : sorted.filter((a) => a.severity === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.zoneDashboard.alertsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <SeverityFilterPills value={filter} onChange={setFilter} counts={counts} />
        <AlertList
          alerts={filtered}
          emptyLabel={
            alerts.length === 0
              ? t.alerts.noAlertsThisZone
              : t.alerts.noAlertsThisSeverity
          }
        />
      </CardContent>
    </Card>
  );
}
