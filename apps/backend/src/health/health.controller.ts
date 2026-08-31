import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
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

    // TODO(backend-sprint-5/6): add InfluxDB and MinIO reachability checks
    // once those clients exist.
    return this.health.check([database]);
  }
}
