import { DevicePollResult } from '../snmp/snmp-provider.interface';
import { computeDeviceSeverity, Severity, severityRank } from './severity.util';

export type AlertMessageKey =
  'DEVICE_OFFLINE' | 'HIGH_BANDWIDTH' | 'HIGH_MEMORY' | 'HIGH_CPU';

export interface DeviceUpdate {
  status: 'ONLINE' | 'OFFLINE';
  severity: Severity;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  connectedClients?: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  /** Set only when severity worsened this poll and rose above NORMAL. */
  newAlert: { severity: Severity; messageKey: AlertMessageKey } | null;
}

/** Picks which metric "caused" a non-normal severity, for the alert log. */
function pickAlertMessageKey(poll: DevicePollResult): AlertMessageKey {
  if (!poll.reachable) return 'DEVICE_OFFLINE';

  const bandwidth = poll.bandwidthUsagePercent ?? 0;
  const memory = poll.memoryUsagePercent;
  const cpu = poll.cpuUsagePercent;

  if (cpu >= memory && cpu >= bandwidth) return 'HIGH_CPU';
  if (bandwidth >= memory) return 'HIGH_BANDWIDTH';
  return 'HIGH_MEMORY';
}

export function buildDeviceUpdate(
  previousSeverity: Severity,
  poll: DevicePollResult,
): DeviceUpdate {
  const severity = computeDeviceSeverity({
    reachable: poll.reachable,
    cpuUsagePercent: poll.cpuUsagePercent,
    memoryUsagePercent: poll.memoryUsagePercent,
    bandwidthUsagePercent: poll.bandwidthUsagePercent,
  });

  const severityWorsened =
    severityRank(severity) > severityRank(previousSeverity);
  const messageKey =
    severityWorsened && severity !== 'NORMAL'
      ? pickAlertMessageKey(poll)
      : null;

  return {
    status: poll.reachable ? 'ONLINE' : 'OFFLINE',
    severity,
    cpuUsagePercent: poll.cpuUsagePercent,
    memoryUsagePercent: poll.memoryUsagePercent,
    connectedClients: poll.connectedClients,
    bandwidthUsagePercent: poll.bandwidthUsagePercent,
    trafficInMbps: poll.trafficInMbps,
    trafficOutMbps: poll.trafficOutMbps,
    newAlert: messageKey ? { severity, messageKey } : null,
  };
}
