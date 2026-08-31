"use client";

import * as React from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { useNetworkData } from "@/lib/network-data-context";
import { useLiveMetrics } from "@/lib/live-metrics";
import { useLocale } from "@/lib/i18n/locale-context";
import { Device } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceHeader } from "@/components/devices/device-header";
import { UsageBar } from "@/components/devices/usage-bar";
import { PortTable } from "@/components/devices/port-table";
import { TrafficChart } from "@/components/devices/traffic-chart";
import { DeviceMap } from "@/components/devices/device-map-loader";
import { DeviceFormDialog } from "@/components/zones/device-form-dialog";
import { DeleteDeviceDialog } from "@/components/zones/delete-device-dialog";
import { PageLoading } from "@/components/layout/page-loading";

export default function SwitchDetailPage() {
  const params = useParams<{ zoneId: string; deviceId: string }>();
  const router = useRouter();
  const { zones, devices, isLoading } = useNetworkData();
  const { t } = useLocale();

  const zone = zones.find((z) => z.id === params.zoneId);
  const device = devices.find(
    (d) => d.id === params.deviceId && d.kind === "switch"
  );

  usePageTitle(device?.name ?? t.zoneDashboard.switchLabel);

  if (isLoading) return <PageLoading />;
  if (!zone || !device) notFound();

  return <SwitchMonitor key={device.id} zone={zone.name} zoneId={zone.id} device={device} onDeleted={() => router.push(`/zones/${zone.id}`)} />;
}

function SwitchMonitor({
  zone,
  zoneId,
  device,
  onDeleted,
}: {
  zone: string;
  zoneId: string;
  device: Device;
  onDeleted: () => void;
}) {
  const metrics = useLiveMetrics(device);
  const { t, intlTag } = useLocale();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const portsUp = metrics.ports?.filter((p) => p.status === "up").length ?? 0;
  const portsTotal = metrics.ports?.length ?? 0;

  return (
    <div className="space-y-6">
      <DeviceHeader
        device={device}
        zoneName={zone}
        zoneId={zoneId}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t.deviceDetail.overviewTab}</TabsTrigger>
          <TabsTrigger value="ports">{t.deviceDetail.portsTab(portsUp, portsTotal)}</TabsTrigger>
          <TabsTrigger value="traffic">{t.deviceDetail.trafficTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-6 py-5 sm:grid-cols-2">
              <UsageBar label={t.deviceDetail.cpuUsage} percent={metrics.cpuUsagePercent} />
              <UsageBar label={t.deviceDetail.memoryUsage} percent={metrics.memoryUsagePercent} />
              <div className="sm:col-span-2 font-mono text-xs text-ink-400">
                {t.deviceDetail.lastUpdate(new Date(device.lastUpdate).toLocaleString(intlTag))}
                {device.status === "online" && t.deviceDetail.liveUpdateNote}
              </div>
            </CardContent>
          </Card>
          {device.mapPosition && (
            <Card className="mt-4">
              <CardContent className="pt-5">
                <DeviceMap devices={[device]} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ports">
          <Card>
            <CardContent className="pt-5">
              <PortTable ports={metrics.ports ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic">
          <Card>
            <CardContent className="pt-5">
              <TrafficChart history={metrics.history} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeviceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        kind="switch"
        zoneId={zoneId}
        device={device}
      />
      <DeleteDeviceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        device={device}
        onDeleted={onDeleted}
      />
    </div>
  );
}
