"use client";

import * as React from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  MoreVertical,
  Pencil,
  Plus,
  Router,
  Signal,
  PowerOff,
  Trash2,
  Wifi,
} from "lucide-react";
import { usePageTitle } from "@/lib/page-title-context";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { getDevicesByZone } from "@/lib/stats";
import { Device } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/dashboard/stat-card";
import { DeviceMap } from "@/components/devices/device-map-loader";
import { ZoneAlertsCard } from "@/components/alerts/zone-alerts-card";
import { DeviceTable } from "@/components/zones/device-table";
import { ZoneFormDialog } from "@/components/zones/zone-form-dialog";
import { DeleteZoneDialog } from "@/components/zones/delete-zone-dialog";
import { DeviceFormDialog } from "@/components/zones/device-form-dialog";
import { DeleteDeviceDialog } from "@/components/zones/delete-device-dialog";
import { PageLoading } from "@/components/layout/page-loading";

export default function ZoneDashboardPage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { zones, devices, alerts, isLoading } = useNetworkData();
  const { t } = useLocale();
  const zone = zones.find((z) => z.id === params.zoneId);
  const [editZoneOpen, setEditZoneOpen] = React.useState(false);
  const [deleteZoneOpen, setDeleteZoneOpen] = React.useState(false);

  usePageTitle(zone?.name ?? t.zoneDashboard.switchLabel);

  if (isLoading) return <PageLoading />;
  if (!zone) notFound();

  const zoneDevices = getDevicesByZone(devices, zone.id);
  const zoneAlerts = alerts.filter((a) => a.zoneId === zone.id);
  const switches = zoneDevices.filter((d) => d.kind === "switch");
  const accessPoints = zoneDevices.filter((d) => d.kind === "access_point");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {zone.name}
          </h2>
          <p className="font-mono text-xs text-ink-400">{zone.id}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t.zoneDashboard.menuAria}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditZoneOpen(true)}>
              <Pencil className="size-4" />
              {t.zonesPage.editName}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteZoneOpen(true)}
              className="text-sev-critical data-[highlighted]:bg-sev-critical-bg data-[highlighted]:text-sev-critical"
            >
              <Trash2 className="size-4" />
              {t.zonesPage.deleteZone}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.zoneDashboard.switchLabel}
          value={zone.switchCount}
          icon={Router}
          tone="brand"
        />
        <StatCard
          label={t.zoneDashboard.accessPointLabel}
          value={zone.accessPointCount}
          icon={Wifi}
          tone="brand"
        />
        <StatCard
          label={t.zoneDashboard.onlineLabel}
          value={zone.onlineCount}
          icon={Signal}
          tone="normal"
        />
        <StatCard
          label={t.zoneDashboard.offlineLabel}
          value={zone.offlineCount}
          icon={PowerOff}
          tone="critical"
        />
      </div>

      <ZoneAlertsCard alerts={zoneAlerts} />

      <Card>
        <CardHeader>
          <CardTitle>{t.zoneDashboard.mapTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DeviceMap devices={zoneDevices} />
        </CardContent>
      </Card>

      <DeviceSection
        title={t.zoneDashboard.switchLabel}
        icon={Router}
        kind="switch"
        zoneId={zone.id}
        devices={switches}
        emptyLabel={t.zoneDashboard.emptySwitch}
      />

      <DeviceSection
        title={t.zoneDashboard.accessPointLabel}
        icon={Wifi}
        kind="access_point"
        zoneId={zone.id}
        devices={accessPoints}
        emptyLabel={t.zoneDashboard.emptyAccessPoint}
      />

      <ZoneFormDialog
        open={editZoneOpen}
        onOpenChange={setEditZoneOpen}
        mode="edit"
        zoneId={zone.id}
        initialName={zone.name}
      />
      <DeleteZoneDialog
        open={deleteZoneOpen}
        onOpenChange={setDeleteZoneOpen}
        zone={zone}
        onDeleted={() => router.push("/zones")}
      />
    </div>
  );
}

function DeviceSection({
  title,
  icon: Icon,
  kind,
  zoneId,
  devices,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  kind: Device["kind"];
  zoneId: string;
  devices: Device[];
  emptyLabel: string;
}) {
  const { t } = useLocale();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingDevice, setEditingDevice] = React.useState<Device | null>(null);
  const [deletingDevice, setDeletingDevice] = React.useState<Device | null>(null);

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-brand-700" />
            {title} ({devices.length})
          </CardTitle>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => {
            setEditingDevice(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t.zoneDashboard.addDevice(title)}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <DeviceTable
          devices={devices}
          emptyLabel={emptyLabel}
          onEdit={(device) => {
            setEditingDevice(device);
            setFormOpen(true);
          }}
          onDelete={(device) => setDeletingDevice(device)}
        />
      </CardContent>

      <DeviceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        kind={kind}
        zoneId={zoneId}
        device={editingDevice}
      />
      <DeleteDeviceDialog
        open={!!deletingDevice}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        device={deletingDevice}
      />
    </Card>
  );
}
