export type Severity = 'NORMAL' | 'WARNING' | 'MAJOR' | 'CRITICAL';
export type DeviceKind = 'SWITCH' | 'ACCESS_POINT';
export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export interface DeviceForSummary {
  zoneId: string;
  kind: DeviceKind;
  status: DeviceStatus;
  severity: Severity;
}

export interface ZoneSummary {
  id: string;
  name: string;
  switchCount: number;
  accessPointCount: number;
  onlineCount: number;
  offlineCount: number;
  alertCounts: Record<'critical' | 'major' | 'warning' | 'normal', number>;
}

/**
 * Mirrors apps/frontend/src/lib/stats.ts `buildZones()`: Zone never stores
 * counts — they're always derived from the current device list. Every
 * device falls into exactly one severity bucket (offline devices are always
 * CRITICAL), so alertCounts always sums to the zone's total device count.
 */
export function buildZoneSummaries<Z extends { id: string; name: string }>(
  zones: Z[],
  devices: DeviceForSummary[],
): ZoneSummary[] {
  return zones.map((zone) => {
    const zoneDevices = devices.filter((d) => d.zoneId === zone.id);
    const alertCounts: ZoneSummary['alertCounts'] = {
      critical: 0,
      major: 0,
      warning: 0,
      normal: 0,
    };
    let switchCount = 0;
    let accessPointCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    for (const device of zoneDevices) {
      if (device.kind === 'SWITCH') switchCount += 1;
      else accessPointCount += 1;
      if (device.status === 'ONLINE') onlineCount += 1;
      else offlineCount += 1;
      const key = device.severity.toLowerCase() as
        'critical' | 'major' | 'warning' | 'normal';
      alertCounts[key] += 1;
    }

    return {
      id: zone.id,
      name: zone.name,
      switchCount,
      accessPointCount,
      onlineCount,
      offlineCount,
      alertCounts,
    };
  });
}
