import { Severity } from '../monitoring/severity.util';

export const DEVICE_METRICS_UPDATED_EVENT = 'device.metrics.updated';

export interface PortSnapshot {
  portNumber: number;
  status: 'UP' | 'DOWN';
  speedMbps: number;
  bandwidthUsagePercent: number;
  trafficInMbps: number;
  trafficOutMbps: number;
}

/** Emitted internally by MonitoringService after each device poll+apply. */
export interface DeviceMetricsUpdatedEvent {
  deviceId: string;
  zoneId: string;
  status: 'ONLINE' | 'OFFLINE';
  severity: Severity;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  connectedClients?: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  ports?: PortSnapshot[];
  timestamp: string;
}

export function deviceRoom(deviceId: string): string {
  return `device:${deviceId}`;
}
