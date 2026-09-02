export type SeverityLevel = "normal" | "warning" | "major" | "critical";

export type DeviceKind = "switch" | "access_point";

export type DeviceStatus = "online" | "offline";

export interface Zone {
  id: string;
  name: string;
  switchCount: number;
  accessPointCount: number;
  onlineCount: number;
  offlineCount: number;
  alertCounts: Record<SeverityLevel, number>;
}

export interface PortStatus {
  portNumber: number;
  status: "up" | "down";
  speedMbps: number;
  bandwidthUsagePercent: number;
  trafficInMbps: number;
  trafficOutMbps: number;
}

export interface Device {
  id: string;
  zoneId: string;
  kind: DeviceKind;
  name: string;
  ipAddress: string;
  brand: string;
  model: string;
  /** Per-device SNMP v2c community override — blank means use the server's default. */
  snmpCommunity?: string;
  imageUrl?: string;
  mapPosition?: { lat: number; lng: number };
  status: DeviceStatus;
  /** Current health classification — offline devices are always "critical". */
  severity: SeverityLevel;
  lastUpdate: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  /** Access Point only */
  connectedClients?: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  /** Switch only */
  ports?: PortStatus[];
}

export type AlertMessageKey = "deviceOffline" | "highBandwidth" | "highMemory" | "highCpu";

export interface AlertItem {
  id: string;
  zoneId: string;
  zoneName: string;
  deviceId: string;
  deviceName: string;
  deviceKind: DeviceKind;
  severity: SeverityLevel;
  messageKey: AlertMessageKey;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: "administrator";
}
