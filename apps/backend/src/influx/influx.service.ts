import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InfluxDB,
  Point,
  WriteApi,
  QueryApi,
} from '@influxdata/influxdb-client';
import { AppConfig } from '../config/configuration';

export interface DeviceMetricPoint {
  deviceId: string;
  zoneId: string;
  kind: 'SWITCH' | 'ACCESS_POINT';
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  bandwidthUsagePercent?: number;
  trafficInMbps?: number;
  trafficOutMbps?: number;
  connectedClients?: number;
}

export interface TrafficHistoryPoint {
  time: string;
  in: number;
  out: number;
}

// deviceId is always a Prisma cuid() (lowercase alphanumeric) in this app,
// never raw user input — but Flux queries are built by string interpolation
// below (the client library has no parameterized-query helper for this),
// so this guard is defense-in-depth against ever accidentally interpolating
// something else in here later.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

@Injectable()
export class InfluxService implements OnModuleDestroy {
  private readonly logger = new Logger(InfluxService.name);
  private readonly writeApi: WriteApi;
  private readonly queryApi: QueryApi;
  private readonly bucket: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const influx = config.get('influx', { infer: true });
    const client = new InfluxDB({ url: influx.url, token: influx.token });
    this.writeApi = client.getWriteApi(influx.org, influx.bucket, 'ms');
    this.writeApi.useDefaultTags({ app: 'up-nms' });
    this.queryApi = client.getQueryApi(influx.org);
    this.bucket = influx.bucket;
  }

  writeDeviceMetric(metric: DeviceMetricPoint): void {
    const point = new Point('device_metrics')
      .tag('deviceId', metric.deviceId)
      .tag('zoneId', metric.zoneId)
      .tag('kind', metric.kind)
      .floatField('cpuUsagePercent', metric.cpuUsagePercent)
      .floatField('memoryUsagePercent', metric.memoryUsagePercent);

    if (metric.bandwidthUsagePercent !== undefined) {
      point.floatField('bandwidthUsagePercent', metric.bandwidthUsagePercent);
    }
    if (metric.trafficInMbps !== undefined) {
      point.floatField('trafficInMbps', metric.trafficInMbps);
    }
    if (metric.trafficOutMbps !== undefined) {
      point.floatField('trafficOutMbps', metric.trafficOutMbps);
    }
    if (metric.connectedClients !== undefined) {
      point.intField('connectedClients', metric.connectedClients);
    }

    this.writeApi.writePoint(point);
  }

  /** Flushes buffered points. Safe to call even if InfluxDB is unreachable. */
  async flush(): Promise<void> {
    try {
      await this.writeApi.flush();
    } catch (error) {
      this.logger.warn(
        `Failed to flush metrics to InfluxDB: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Reads back trafficInMbps/trafficOutMbps for one device over the last
   * `rangeMinutes`, so the frontend's Traffic tab can render a real
   * historical graph on page load instead of starting empty and only ever
   * showing points accumulated live since the tab was opened — which is
   * what it did before this method existed, despite InfluxDB being written
   * to on every poll cycle the whole time (write-only, nothing ever read
   * it back). Returns points oldest-first. Never throws — an unreachable
   * InfluxDB here should degrade to "no history yet", not break the page.
   */
  async queryDeviceTraffic(
    deviceId: string,
    rangeMinutes = 60,
  ): Promise<TrafficHistoryPoint[]> {
    if (!SAFE_ID_PATTERN.test(deviceId)) {
      this.logger.warn(
        `Refusing to query traffic history for suspicious deviceId: ${deviceId}`,
      );
      return [];
    }

    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -${Math.max(1, Math.floor(rangeMinutes))}m)
        |> filter(fn: (r) => r._measurement == "device_metrics")
        |> filter(fn: (r) => r.deviceId == "${deviceId}")
        |> filter(fn: (r) => r._field == "trafficInMbps" or r._field == "trafficOutMbps")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"])
    `;

    try {
      const rows =
        await this.queryApi.collectRows<Record<string, string>>(fluxQuery);
      return rows
        .filter((row) => row._time)
        .map((row) => ({
          time: row._time,
          in: Number(row.trafficInMbps) || 0,
          out: Number(row.trafficOutMbps) || 0,
        }));
    } catch (error) {
      this.logger.warn(
        `Failed to query traffic history for device ${deviceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async onModuleDestroy() {
    await this.writeApi.close().catch(() => undefined);
  }
}
