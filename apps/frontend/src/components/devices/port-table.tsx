"use client";

import { Badge } from "@/components/ui/badge";
import { PortStatus } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";

export function PortTable({ ports }: { ports: PortStatus[] }) {
  const { t } = useLocale();

  if (ports.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">{t.portTable.noPorts}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs text-ink-400">
            <th className="py-2 pr-4 font-medium">{t.portTable.port}</th>
            <th className="py-2 pr-4 font-medium">{t.portTable.status}</th>
            <th className="py-2 pr-4 font-medium">{t.portTable.speed}</th>
            <th className="py-2 pr-4 font-medium">{t.portTable.bandwidth}</th>
            <th className="py-2 pr-4 font-medium">{t.portTable.trafficIn}</th>
            <th className="py-2 font-medium">{t.portTable.trafficOut}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {ports.map((port) => (
            <tr key={port.portNumber}>
              <td className="py-2 pr-4 font-mono text-xs text-ink-900">
                {port.name ?? t.portTable.portFallback(port.portNumber)}
              </td>
              <td className="py-2 pr-4">
                <Badge variant={port.status === "up" ? "normal" : "offline"}>
                  {port.status === "up" ? t.portTable.up : t.portTable.down}
                </Badge>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-ink-600">
                {port.speedMbps > 0 ? `${port.speedMbps} Mbps` : "—"}
              </td>
              <td className="py-2 pr-4">
                {port.status === "up" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-50">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${port.bandwidthUsagePercent}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-ink-600">
                      {port.bandwidthUsagePercent}%
                    </span>
                  </div>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-ink-600">
                {port.status === "up" ? `${port.trafficInMbps} Mbps` : "—"}
              </td>
              <td className="py-2 font-mono text-xs text-ink-600">
                {port.status === "up" ? `${port.trafficOutMbps} Mbps` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
