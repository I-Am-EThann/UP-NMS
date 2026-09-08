"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import { Device, PortStatus } from "@/lib/types";
import { WS_BASE_URL } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-client";
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

/** Raw shape returned by GET /devices/:id/traffic-history — `time` is a
 *  full ISO timestamp here, formatted into a display string once merged
 *  into `LiveMetrics.history` (same formatting the live WebSocket path
 *  already applies), so the chart's X-axis is consistent either way. */
interface TrafficHistoryPoint {
  time: string;
  in: number;
  out: number;
}

const HISTORY_LENGTH = 24;

function formatPointTime(isoOrEventTime: string): string {
  return new Date(isoOrEventTime).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

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
 *
 * Also fetches recent history from InfluxDB on mount so the Traffic tab's
 * chart has real data immediately — previously `history` only ever started
 * empty and accumulated live points from the moment the page was opened,
 * which meant a real historical graph (the whole reason InfluxDB is in this
 * architecture) never actually appeared: the chart needs 2+ points to draw
 * anything, and a poll only happens once per SNMP_POLL_INTERVAL_MS (5
 * minutes by default), so it took 10+ minutes of the tab staying open
 * before a graph would show up at all, resetting to nothing on every
 * refresh or navigation away and back.
 */
export function useLiveMetrics(device: Device): LiveMetrics {
  const [metrics, setMetrics] = React.useState<LiveMetrics>(() =>
    seedFromDevice(device)
  );

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<TrafficHistoryPoint[]>(`/devices/${device.id}/traffic-history?minutes=60`)
      .then((points) => {
        if (cancelled || points.length === 0) return;
        setMetrics((prev) => ({
          ...prev,
          history: [
            ...points.map((p) => ({
              time: formatPointTime(p.time),
              in: Math.round(p.in),
              out: Math.round(p.out),
            })),
            ...prev.history,
          ].slice(-HISTORY_LENGTH),
        }));
      })
      .catch(() => {
        // Historical graph is a nice-to-have, not essential — if InfluxDB
        // is unreachable or the request fails, the chart just falls back
        // to building up from live WebSocket points instead, same as it
        // always did before this existed.
      });

    return () => {
      cancelled = true;
    };
  }, [device.id]);

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
          time: formatPointTime(event.timestamp),
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
