"use client";

import { Router, Wifi, Signal, PowerOff } from "lucide-react";
import { usePageTitle } from "@/lib/page-title-context";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { computeOverviewTotals, sortAlerts } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { SeverityOverviewChart } from "@/components/dashboard/severity-overview-chart";
import { DeviceStatusDonut } from "@/components/dashboard/device-status-donut";
import { ZoneAlertTable } from "@/components/dashboard/zone-alert-table";
import { AlertList } from "@/components/alerts/alert-list";
import { PageLoading } from "@/components/layout/page-loading";

export default function DashboardPage() {
  const { t } = useLocale();
  usePageTitle(t.dashboard.title);
  const { zones, alerts, isLoading } = useNetworkData();

  const totals = computeOverviewTotals(zones);
  const recentAlerts = sortAlerts(alerts).slice(0, 6);

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.dashboard.totalSwitch}
          value={totals.totalSwitch}
          icon={Router}
          tone="brand"
        />
        <StatCard
          label={t.dashboard.totalAccessPoint}
          value={totals.totalAccessPoint}
          icon={Wifi}
          tone="brand"
        />
        <StatCard
          label={t.dashboard.online}
          value={totals.totalOnline}
          icon={Signal}
          tone="normal"
          caption={t.dashboard.zonesCaption(zones.length)}
        />
        <StatCard
          label={t.dashboard.offline}
          value={totals.totalOffline}
          icon={PowerOff}
          tone="critical"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.alertSummaryTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityOverviewChart zones={zones} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.deviceStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceStatusDonut totals={totals} />
            <div className="mt-2 flex items-center justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-ink-600">
                <span className="size-2 rounded-full bg-sev-normal" /> {t.dashboard.online}
              </span>
              <span className="flex items-center gap-1.5 text-ink-600">
                <span className="size-2 rounded-full bg-sev-offline" /> {t.dashboard.offline}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentAlertsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <AlertList
              alerts={recentAlerts}
              showZone
              emptyLabel={t.dashboard.noAlertsInSystem}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.byZoneTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ZoneAlertTable zones={zones} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
