"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import { Device, PortStatus } from "@/lib/types";
import { WS_BASE_URL } from "@/lib/api-config";
import { BackendPort, mapPort } from "@/lib/api-mappers";

export interface TrafficPoint {
  time: string;
  in: number;
  out: number;
}

export interface LiveMetrics {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  connectedClients?: number;
  ports?: PortStatus[];
  history: TrafficPoint[];
}

interface DeviceMetricsEvent {
  deviceId: string;
  status: "ONLINE" | "OFFLINE";
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  connectedClients?: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  ports?: BackendPort[];
  timestamp: string;
}

const HISTORY_LENGTH = 24;

function seedFromDevice(device: Device): LiveMetrics {
  return {
    cpuUsagePercent: device.cpuUsagePercent,
    memoryUsagePercent: device.memoryUsagePercent,
    bandwidthUsagePercent: device.bandwidthUsagePercent,
    trafficInMbps: device.trafficInMbps,
    trafficOutMbps: device.trafficOutMbps,
    connectedClients: device.connectedClients,
    ports: device.ports,
    history: [],
  };
}

/**
 * Subscribes to this device's live-metrics room over the backend's
 * `/realtime` Socket.io namespace. Render the consuming component with
 * `key={device.id}` so this resets cleanly when navigating between devices.
 */
export function useLiveMetrics(device: Device): LiveMetrics {
  const [metrics, setMetrics] = React.useState<LiveMetrics>(() =>
    seedFromDevice(device)
  );

  React.useEffect(() => {
    const socket: Socket = io(`${WS_BASE_URL}/realtime`, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("device:subscribe", { deviceId: device.id });
    });

    socket.on("device:metrics", (event: DeviceMetricsEvent) => {
      if (event.deviceId !== device.id) return;

      setMetrics((prev) => {
        const ports = event.ports?.map(mapPort) ?? prev.ports;
        const aggregateIn =
          event.trafficInMbps ??
          ports?.reduce((sum, p) => sum + p.trafficInMbps, 0) ??
          0;
        const aggregateOut =
          event.trafficOutMbps ??
          ports?.reduce((sum, p) => sum + p.trafficOutMbps, 0) ??
          0;

        const point: TrafficPoint = {
          time: new Date(event.timestamp).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          in: Math.round(aggregateIn),
          out: Math.round(aggregateOut),
        };

        return {
          cpuUsagePercent: event.cpuUsagePercent,
          memoryUsagePercent: event.memoryUsagePercent,
          bandwidthUsagePercent: event.bandwidthUsagePercent,
          trafficInMbps: event.trafficInMbps,
          trafficOutMbps: event.trafficOutMbps,
          connectedClients: event.connectedClients,
          ports,
          history: [...prev.history, point].slice(-HISTORY_LENGTH),
        };
      });
    });

    return () => {
      socket.emit("device:unsubscribe", { deviceId: device.id });
      socket.disconnect();
    };
  }, [device.id]);

  return metrics;
}
