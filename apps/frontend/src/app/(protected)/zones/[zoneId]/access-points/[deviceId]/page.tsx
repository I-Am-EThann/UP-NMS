"use client";

import * as React from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { usePageTitle } from "@/lib/page-title-context";
import { useNetworkData } from "@/lib/network-data-context";
import { useLiveMetrics } from "@/lib/live-metrics";
import { useLocale } from "@/lib/i18n/locale-context";
import { Device } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceHeader } from "@/components/devices/device-header";
import { UsageBar } from "@/components/devices/usage-bar";
import { TrafficChart } from "@/components/devices/traffic-chart";
import { DeviceMap } from "@/components/devices/device-map-loader";
import { DeviceFormDialog } from "@/components/zones/device-form-dialog";
import { DeleteDeviceDialog } from "@/components/zones/delete-device-dialog";
import { PageLoading } from "@/components/layout/page-loading";

export default function AccessPointDetailPage() {
  const params = useParams<{ zoneId: string; deviceId: string }>();
  const router = useRouter();
  const { zones, devices, isLoading } = useNetworkData();
  const { t } = useLocale();

  const zone = zones.find((z) => z.id === params.zoneId);
  const device = devices.find(
    (d) => d.id === params.deviceId && d.kind === "access_point"
  );

  usePageTitle(device?.name ?? t.zoneDashboard.accessPointLabel);

  if (isLoading) return <PageLoading />;
  if (!zone || !device) notFound();

  return (
    <AccessPointMonitor
      key={device.id}
      zone={zone.name}
      zoneId={zone.id}
      device={device}
      onDeleted={() => router.push(`/zones/${zone.id}`)}
    />
  );
}

function AccessPointMonitor({
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
          <TabsTrigger value="traffic">{t.deviceDetail.trafficTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-6 py-5 sm:grid-cols-2">
              <UsageBar label={t.deviceDetail.cpuUsage} percent={metrics.cpuUsagePercent} />
              <UsageBar label={t.deviceDetail.memoryUsage} percent={metrics.memoryUsagePercent} />
              <UsageBar
                label={t.deviceDetail.bandwidthUsage}
                percent={metrics.bandwidthUsagePercent ?? 0}
              />
              <div>
                <p className="text-xs font-medium text-ink-400">
                  {t.deviceDetail.connectedClients}
                </p>
                <p className="mt-1.5 flex items-center gap-2 font-display text-2xl font-semibold text-ink-900">
                  <Users className="size-5 text-brand-700" />
                  {metrics.connectedClients ?? 0}
                </p>
              </div>
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
        kind="access_point"
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
