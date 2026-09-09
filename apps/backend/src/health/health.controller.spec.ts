import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { InfluxService } from '../influx/influx.service';
import { MinioService } from '../minio/minio.service';

describe('HealthController', () => {
  const queryRaw = jest.fn();
  const isInfluxHealthy = jest.fn();
  const isMinioHealthy = jest.fn();

  async function makeController(): Promise<HealthController> {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
        { provide: InfluxService, useValue: { isHealthy: isInfluxHealthy } },
        { provide: MinioService, useValue: { isHealthy: isMinioHealthy } },
      ],
    })
      .setLogger({
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      })
      .compile();

    return moduleRef.get(HealthController);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports "ok" and all three datastores up when everything is reachable', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    isInfluxHealthy.mockResolvedValue(true);
    isMinioHealthy.mockResolvedValue(true);
    const controller = await makeController();

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.details.database).toEqual({ status: 'up' });
    expect(result.details.influxdb).toEqual({ status: 'up' });
    expect(result.details.minio).toEqual({ status: 'up' });
  });

  it('responds 503 Service Unavailable when only InfluxDB is unreachable, with per-service detail', async () => {
    // Regression coverage: before InfluxDB/MinIO indicators existed here at
    // all, this endpoint stayed a plain 200 "ok" no matter what state those
    // two datastores were in — a monitoring tool watching /api/health had
    // no way to tell metrics history (InfluxDB) was down. Terminus reports
    // a failed check by *throwing* ServiceUnavailableException (503) with
    // the per-indicator breakdown attached, rather than resolving with an
    // "error" status in the return value — asserted here so this doesn't
    // silently regress to "always 200" again in the future.
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    isInfluxHealthy.mockResolvedValue(false);
    isMinioHealthy.mockResolvedValue(true);
    const controller = await makeController();

    let caught: ServiceUnavailableException | undefined;
    try {
      await controller.check();
    } catch (error) {
      caught = error as ServiceUnavailableException;
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    const body = caught?.getResponse() as {
      status: string;
      details: Record<string, { status: string }>;
    };
    expect(body.status).toBe('error');
    expect(body.details.database).toEqual({ status: 'up' });
    expect(body.details.influxdb).toEqual({ status: 'down' });
    expect(body.details.minio).toEqual({ status: 'up' });
  });

  it('responds 503 when only MinIO is unreachable', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    isInfluxHealthy.mockResolvedValue(true);
    isMinioHealthy.mockResolvedValue(false);
    const controller = await makeController();

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('responds 503 with the connection error message when Postgres itself is unreachable', async () => {
    queryRaw.mockRejectedValue(new Error('connect ECONNREFUSED'));
    isInfluxHealthy.mockResolvedValue(true);
    isMinioHealthy.mockResolvedValue(true);
    const controller = await makeController();

    let caught: ServiceUnavailableException | undefined;
    try {
      await controller.check();
    } catch (error) {
      caught = error as ServiceUnavailableException;
    }

    const body = caught?.getResponse() as {
      details: Record<string, { status: string; message?: string }>;
    };
    expect(body.details.database).toEqual(
      expect.objectContaining({
        status: 'down',
        message: 'connect ECONNREFUSED',
      }),
    );
  });
});
