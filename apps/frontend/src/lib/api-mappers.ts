import {
  AlertItem,
  AlertMessageKey,
  AuthUser,
  Device,
  DeviceKind,
  DeviceStatus,
  PortStatus,
  SeverityLevel,
} from "./types";

type BackendDeviceKind = "SWITCH" | "ACCESS_POINT";
type BackendDeviceStatus = "ONLINE" | "OFFLINE";
type BackendSeverity = "NORMAL" | "WARNING" | "MAJOR" | "CRITICAL";
type BackendPortStatus = "UP" | "DOWN";
type BackendMessageKey =
  | "DEVICE_OFFLINE"
  | "HIGH_BANDWIDTH"
  | "HIGH_MEMORY"
  | "HIGH_CPU";

const DEVICE_KIND_MAP: Record<BackendDeviceKind, DeviceKind> = {
  SWITCH: "switch",
  ACCESS_POINT: "access_point",
};

const MESSAGE_KEY_MAP: Record<BackendMessageKey, AlertMessageKey> = {
  DEVICE_OFFLINE: "deviceOffline",
  HIGH_BANDWIDTH: "highBandwidth",
  HIGH_MEMORY: "highMemory",
  HIGH_CPU: "highCpu",
};

function lower<T extends string>(value: string): T {
  return value.toLowerCase() as T;
}

export interface BackendPort {
  portNumber: number;
  status: BackendPortStatus;
  speedMbps: number;
  bandwidthUsagePercent: number;
  trafficInMbps: number;
  trafficOutMbps: number;
}

export interface BackendDevice {
  id: string;
  zoneId: string;
  kind: BackendDeviceKind;
  name: string;
  ipAddress: string;
  brand: string;
  model: string;
  imageUrl?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  status: BackendDeviceStatus;
  severity: BackendSeverity;
  lastUpdate: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  connectedClients?: number | null;
  bandwidthUsagePercent?: number | null;
  trafficInMbps?: number | null;
  trafficOutMbps?: number | null;
  ports?: BackendPort[];
}

export function mapPort(p: BackendPort): PortStatus {
  return {
    portNumber: p.portNumber,
    status: lower<PortStatus["status"]>(p.status),
    speedMbps: p.speedMbps,
    bandwidthUsagePercent: p.bandwidthUsagePercent,
    trafficInMbps: p.trafficInMbps,
    trafficOutMbps: p.trafficOutMbps,
  };
}

export function mapDevice(d: BackendDevice): Device {
  return {
    id: d.id,
    zoneId: d.zoneId,
    kind: DEVICE_KIND_MAP[d.kind],
    name: d.name,
    ipAddress: d.ipAddress,
    brand: d.brand,
    model: d.model,
    imageUrl: d.imageUrl ?? undefined,
    mapPosition:
      d.mapLat != null && d.mapLng != null
        ? { lat: d.mapLat, lng: d.mapLng }
        : undefined,
    status: lower<DeviceStatus>(d.status),
    severity: lower<SeverityLevel>(d.severity),
    lastUpdate: d.lastUpdate,
    cpuUsagePercent: d.cpuUsagePercent,
    memoryUsagePercent: d.memoryUsagePercent,
    connectedClients: d.connectedClients ?? undefined,
    bandwidthUsagePercent: d.bandwidthUsagePercent ?? undefined,
    trafficInMbps: d.trafficInMbps ?? undefined,
    trafficOutMbps: d.trafficOutMbps ?? undefined,
    ports: d.ports?.map(mapPort),
  };
}

export interface BackendAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  deviceId: string;
  deviceName: string;
  deviceKind: BackendDeviceKind;
  severity: BackendSeverity;
  messageKey: BackendMessageKey;
  createdAt: string;
}

export function mapAlert(a: BackendAlert): AlertItem {
  return {
    id: a.id,
    zoneId: a.zoneId,
    zoneName: a.zoneName,
    deviceId: a.deviceId,
    deviceName: a.deviceName,
    deviceKind: DEVICE_KIND_MAP[a.deviceKind],
    severity: lower<SeverityLevel>(a.severity),
    messageKey: MESSAGE_KEY_MAP[a.messageKey],
    createdAt: a.createdAt,
  };
}

export interface BackendUser {
  id: string;
  username: string;
  displayName: string;
  role: "ADMINISTRATOR";
}

export function mapUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: "administrator",
  };
}

// --- Frontend -> backend (request payloads) ---

const DEVICE_KIND_TO_BACKEND: Record<DeviceKind, BackendDeviceKind> = {
  switch: "SWITCH",
  access_point: "ACCESS_POINT",
};

export function deviceKindToBackend(kind: DeviceKind): BackendDeviceKind {
  return DEVICE_KIND_TO_BACKEND[kind];
}

export interface DeviceWritePayload {
  name: string;
  ipAddress: string;
  brand: string;
  model: string;
  imageUrl?: string;
  mapLat?: number;
  mapLng?: number;
}

export function deviceToWritePayload(input: {
  name: string;
  ipAddress: string;
  brand: string;
  model: string;
  imageUrl?: string;
  mapPosition?: { lat: number; lng: number };
}): DeviceWritePayload {
  return {
    name: input.name,
    ipAddress: input.ipAddress,
    brand: input.brand,
    model: input.model,
    imageUrl: input.imageUrl,
    mapLat: input.mapPosition?.lat,
    mapLng: input.mapPosition?.lng,
  };
}
