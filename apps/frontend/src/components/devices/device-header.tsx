"use client";

import Link from "next/link";
import { ChevronLeft, Pencil, Router, Trash2, Wifi } from "lucide-react";
import { Device } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DeviceHeader({
  device,
  zoneName,
  zoneId,
  onEdit,
  onDelete,
}: {
  device: Device;
  zoneName: string;
  zoneId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <Link
        href={`/zones/${zoneId}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-700"
      >
        <ChevronLeft className="size-3.5" />
        {zoneName}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-subtle bg-brand-50 text-brand-700">
            {device.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- session-only blob preview, not an optimizable remote asset
              <img src={device.imageUrl} alt="" className="size-full object-cover" />
            ) : device.kind === "switch" ? (
              <Router className="size-6" />
            ) : (
              <Wifi className="size-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {device.name}
              </h2>
              <Badge variant={device.status === "online" ? "normal" : "offline"}>
                {device.status === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
            <p className="font-mono text-xs text-ink-400">
              {device.ipAddress} · {device.brand} {device.model}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 sm:flex-none">
            <Pencil className="size-4" />
            {t.deviceHeader.edit}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1 sm:flex-none">
            <Trash2 className="size-4" />
            {t.deviceHeader.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}
