import { Device, SeverityLevel, Zone } from "@/lib/types";

export interface OverviewTotals {
  totalSwitch: number;
  totalAccessPoint: number;
  totalOnline: number;
  totalOffline: number;
}

export function computeOverviewTotals(zones: Zone[]): OverviewTotals {
  return zones.reduce<OverviewTotals>(
    (acc, zone) => ({
      totalSwitch: acc.totalSwitch + zone.switchCount,
      totalAccessPoint: acc.totalAccessPoint + zone.accessPointCount,
      totalOnline: acc.totalOnline + zone.onlineCount,
      totalOffline: acc.totalOffline + zone.offlineCount,
    }),
    { totalSwitch: 0, totalAccessPoint: 0, totalOnline: 0, totalOffline: 0 }
  );
}

// Fixed order per spec: Critical > Major > Warning > Normal (severity rank,
// not sorted by count) — this is how it should always read on screen.
export const SEVERITY_ORDER: SeverityLevel[] = [
  "critical",
  "major",
  "warning",
  "normal",
];

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  critical: "Critical",
  major: "Major",
  warning: "Warning",
  normal: "Normal",
};

export const SEVERITY_COLOR_VAR: Record<SeverityLevel, string> = {
  critical: "var(--sev-critical)",
  major: "var(--sev-major)",
  warning: "var(--sev-warning)",
  normal: "var(--sev-normal)",
};

export function computeSeverityTotals(zones: Zone[]) {
  const totals: Record<SeverityLevel, number> = {
    critical: 0,
    major: 0,
    warning: 0,
    normal: 0,
  };
  for (const zone of zones) {
    totals.critical += zone.alertCounts.critical;
    totals.major += zone.alertCounts.major;
    totals.warning += zone.alertCounts.warning;
    totals.normal += zone.alertCounts.normal;
  }
  return SEVERITY_ORDER.map((level) => ({
    level,
    label: SEVERITY_LABEL[level],
    count: totals[level],
    color: SEVERITY_COLOR_VAR[level],
  }));
}

export function zoneAlertTotal(zone: Zone) {
  return (
    zone.alertCounts.critical +
    zone.alertCounts.major +
    zone.alertCounts.warning +
    zone.alertCounts.normal
  );
}

export function getDevicesByZone(devices: Device[], zoneId: string) {
  return devices.filter((d) => d.zoneId === zoneId);
}

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  critical: 0,
  major: 1,
  warning: 2,
  normal: 3,
};

/** Critical → Normal first, most recent first within the same severity. */
export function sortAlerts<T extends { severity: SeverityLevel; createdAt: string }>(
  alerts: T[]
): T[] {
  return [...alerts].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
