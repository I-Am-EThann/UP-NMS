import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { InfluxService } from '../influx/influx.service';
import { MinioService } from '../minio/minio.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly influx: InfluxService,
    private readonly minio: MinioService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const database: HealthIndicatorFunction = async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' } };
      } catch (error) {
        return {
          database: {
            status: 'down',
            message: error instanceof Error ? error.message : 'unknown error',
          },
        };
      }
    };

    // InfluxDB and MinIO being briefly unreachable doesn't mean the app is
    // unusable — device CRUD, auth, and the dashboard all work fine off
    // Postgres alone — but a monitoring/deployment tool watching this
    // endpoint should still be able to see that metrics history or image
    // uploads specifically are degraded, rather than this endpoint staying
    // silent about two of the three datastores the whole time (which is
    // what it did before these two indicators existed).
    const influxIndicator: HealthIndicatorFunction = async () => {
      const up = await this.influx.isHealthy();
      return { influxdb: { status: up ? 'up' : 'down' } };
    };

    const minioIndicator: HealthIndicatorFunction = async () => {
      const up = await this.minio.isHealthy();
      return { minio: { status: up ? 'up' : 'down' } };
    };

    return this.health.check([database, influxIndicator, minioIndicator]);
  }
}
