"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Router, Trash2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Device } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";

const severityBadgeVariant = {
  critical: "critical",
  major: "major",
  warning: "warning",
  normal: "normal",
} as const;

interface DeviceTableProps {
  devices: Device[];
  emptyLabel?: string;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

export function DeviceTable({
  devices,
  emptyLabel,
  onEdit,
  onDelete,
}: DeviceTableProps) {
  const { t, intlTag } = useLocale();

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(intlTag, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (devices.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-400">
        {emptyLabel ?? t.zoneDashboard.emptySwitch}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs text-ink-400">
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnDevice}</th>
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnIp}</th>
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnModel}</th>
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnStatus}</th>
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnSeverity}</th>
            <th className="py-2 pr-4 font-medium">{t.deviceTable.columnLastUpdate}</th>
            {(onEdit || onDelete) && <th className="py-2 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {devices.map((device) => (
            <tr key={device.id}>
              <td className="py-2.5 pr-4">
                <Link
                  href={`/zones/${device.zoneId}/${
                    device.kind === "switch" ? "switches" : "access-points"
                  }/${device.id}`}
                  className="flex items-center gap-2 hover:text-brand-700"
                >
                  {device.kind === "switch" ? (
                    <Router className="size-4 text-brand-700" />
                  ) : (
                    <Wifi className="size-4 text-brand-700" />
                  )}
                  <span className="font-medium text-ink-900">{device.name}</span>
                </Link>
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-ink-600">
                {device.ipAddress}
              </td>
              <td className="py-2.5 pr-4 text-ink-600">
                {device.brand} {device.model}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant={device.status === "online" ? "normal" : "offline"}>
                  {device.status === "online" ? "Online" : "Offline"}
                </Badge>
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant={severityBadgeVariant[device.severity]}>
                  {device.severity}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-ink-400">
                {formatTime(device.lastUpdate)}
              </td>
              {(onEdit || onDelete) && (
                <td className="py-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t.deviceTable.actionsAria}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onSelect={() => onEdit(device)}>
                          <Pencil className="size-4" />
                          {t.common.edit}
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onSelect={() => onDelete(device)}
                          className="text-sev-critical data-[highlighted]:bg-sev-critical-bg data-[highlighted]:text-sev-critical"
                        >
                          <Trash2 className="size-4" />
                          {t.common.delete}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
