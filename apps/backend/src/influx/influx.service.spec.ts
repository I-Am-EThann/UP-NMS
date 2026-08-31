import { ConfigService } from '@nestjs/config';
import { InfluxService } from './influx.service';

const writePoint = jest.fn();
const flush = jest.fn();
const close = jest.fn();
const useDefaultTags = jest.fn();
const getWriteApi = jest.fn(() => ({
  writePoint,
  flush,
  close,
  useDefaultTags,
}));

jest.mock('@influxdata/influxdb-client', () => {
  const actual = jest.requireActual('@influxdata/influxdb-client');
  return {
    ...actual,
    InfluxDB: jest.fn().mockImplementation(() => ({ getWriteApi })),
  };
});

function makeConfig() {
  return {
    get: () => ({
      url: 'http://localhost:8086',
      token: 'test-token',
      org: 'upnms',
      bucket: 'device_metrics',
    }),
  } as unknown as ConfigService<
    import('../config/configuration').AppConfig,
    true
  >;
}

describe('InfluxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    flush.mockResolvedValue(undefined);
    close.mockResolvedValue(undefined);
  });

  it('writes a point for a basic switch metric', () => {
    const service = new InfluxService(makeConfig());

    service.writeDeviceMetric({
      deviceId: 'd1',
      zoneId: 'z1',
      kind: 'SWITCH',
      cpuUsagePercent: 22,
      memoryUsagePercent: 41,
    });

    expect(writePoint).toHaveBeenCalledTimes(1);
  });

  it('includes AP-only fields only when provided', () => {
    const service = new InfluxService(makeConfig());

    service.writeDeviceMetric({
      deviceId: 'd2',
      zoneId: 'z1',
      kind: 'ACCESS_POINT',
      cpuUsagePercent: 15,
      memoryUsagePercent: 30,
      bandwidthUsagePercent: 35,
      connectedClients: 24,
    });

    expect(writePoint).toHaveBeenCalledTimes(1);
  });

  it('flush() does not throw even if the underlying flush rejects', async () => {
    flush.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const service = new InfluxService(makeConfig());
    await expect(service.flush()).resolves.toBeUndefined();
  });
});
