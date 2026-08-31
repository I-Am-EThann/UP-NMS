export interface PortPollResult {
  portNumber: number;
  status: 'UP' | 'DOWN';
  speedMbps: number;
  bandwidthUsagePercent: number;
  trafficInMbps: number;
  trafficOutMbps: number;
}

export interface DevicePollResult {
  reachable: boolean;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  /** Access Point only */
  connectedClients?: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  /** Switch only */
  ports?: PortPollResult[];
}

export interface PollableDevice {
  id: string;
  ipAddress: string;
  kind: 'SWITCH' | 'ACCESS_POINT';
  brand: string;
  /** Existing port numbers, so a real provider knows how many to poll for. */
  portNumbers: number[];
}

export interface SnmpProvider {
  pollDevice(device: PollableDevice): Promise<DevicePollResult>;
}

export const SNMP_PROVIDER = Symbol('SNMP_PROVIDER');
