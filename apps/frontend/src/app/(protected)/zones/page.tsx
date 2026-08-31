"use client";

import * as React from "react";
import Link from "next/link";
import { MapPinned, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { usePageTitle } from "@/lib/page-title-context";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { SEVERITY_LABEL, SEVERITY_ORDER, zoneAlertTotal } from "@/lib/stats";
import { Zone } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoneFormDialog } from "@/components/zones/zone-form-dialog";
import { DeleteZoneDialog } from "@/components/zones/delete-zone-dialog";
import { PageLoading } from "@/components/layout/page-loading";

const badgeVariantByLevel = {
  critical: "critical",
  major: "major",
  warning: "warning",
  normal: "normal",
} as const;

export default function ZonesPage() {
  const { t } = useLocale();
  usePageTitle(t.zonesPage.title);
  const { zones, isLoading } = useNetworkData();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editZone, setEditZone] = React.useState<Zone | null>(null);
  const [deleteZone, setDeleteZone] = React.useState<Zone | null>(null);

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-400">{t.zonesPage.countSummary(zones.length)}</p>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4" />
          {t.zonesPage.addZone}
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <MapPinned className="size-6 text-ink-400" />
            <p className="text-sm font-medium text-ink-900">{t.zonesPage.emptyTitle}</p>
            <Button size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t.zonesPage.addZone}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/zones/${zone.id}`}
                    className="font-display text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {zone.name}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={t.zoneDashboard.menuAria}>
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditZone(zone)}>
                        <Pencil className="size-4" />
                        {t.zonesPage.editName}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setDeleteZone(zone)}
                        className="text-sev-critical data-[highlighted]:bg-sev-critical-bg data-[highlighted]:text-sev-critical"
                      >
                        <Trash2 className="size-4" />
                        {t.zonesPage.deleteZone}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="font-mono text-xs text-ink-400">
                  {t.zonesPage.deviceSummary(zone.switchCount, zone.accessPointCount)} ·{" "}
                  <span className="text-sev-normal">
                    {t.zonesPage.onlineSuffix(zone.onlineCount)}
                  </span>
                  {zone.offlineCount > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="text-sev-critical">
                        {t.zonesPage.offlineSuffix(zone.offlineCount)}
                      </span>
                    </>
                  )}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {zoneAlertTotal(zone) === 0 ? (
                    <Badge variant="normal">{t.zonesPage.noAlerts}</Badge>
                  ) : (
                    SEVERITY_ORDER.map((level) => {
                      const count = zone.alertCounts[level];
                      if (count === 0) return null;
                      return (
                        <Badge key={level} variant={badgeVariantByLevel[level]}>
                          {SEVERITY_LABEL[level]} {count}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ZoneFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <ZoneFormDialog
        open={!!editZone}
        onOpenChange={(open) => !open && setEditZone(null)}
        mode="edit"
        zoneId={editZone?.id}
        initialName={editZone?.name ?? ""}
      />
      <DeleteZoneDialog
        open={!!deleteZone}
        onOpenChange={(open) => !open && setDeleteZone(null)}
        zone={deleteZone}
      />
    </div>
  );
}
