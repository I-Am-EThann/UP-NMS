import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
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

@Injectable()
export class InfluxService implements OnModuleDestroy {
  private readonly logger = new Logger(InfluxService.name);
  private readonly writeApi: WriteApi;

  constructor(config: ConfigService<AppConfig, true>) {
    const influx = config.get('influx', { infer: true });
    const client = new InfluxDB({ url: influx.url, token: influx.token });
    this.writeApi = client.getWriteApi(influx.org, influx.bucket, 'ms');
    this.writeApi.useDefaultTags({ app: 'up-nms' });
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

  async onModuleDestroy() {
    await this.writeApi.close().catch(() => undefined);
  }
}
