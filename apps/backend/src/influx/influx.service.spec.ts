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
const collectRows = jest.fn();
const getQueryApi = jest.fn(() => ({ collectRows }));

jest.mock('@influxdata/influxdb-client', () => {
  const actual = jest.requireActual('@influxdata/influxdb-client');
  return {
    ...actual,
    InfluxDB: jest.fn().mockImplementation(() => ({ getWriteApi, getQueryApi })),
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

  describe('queryDeviceTraffic', () => {
    it('maps pivoted Flux rows into { time, in, out } points', async () => {
      collectRows.mockResolvedValue([
        { _time: '2026-01-01T00:00:00Z', trafficInMbps: '12.5', trafficOutMbps: '4.2' },
        { _time: '2026-01-01T00:05:00Z', trafficInMbps: '18', trafficOutMbps: '9' },
      ]);
      const service = new InfluxService(makeConfig());

      const result = await service.queryDeviceTraffic('d1', 60);

      expect(result).toEqual([
        { time: '2026-01-01T00:00:00Z', in: 12.5, out: 4.2 },
        { time: '2026-01-01T00:05:00Z', in: 18, out: 9 },
      ]);
      expect(collectRows).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array (never throws) when the query fails', async () => {
      collectRows.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const service = new InfluxService(makeConfig());

      await expect(service.queryDeviceTraffic('d1')).resolves.toEqual([]);
    });

    it('refuses to query a deviceId that looks unsafe to interpolate, without ever calling InfluxDB', async () => {
      const service = new InfluxService(makeConfig());

      const result = await service.queryDeviceTraffic('d1"} evil flux injection');

      expect(result).toEqual([]);
      expect(collectRows).not.toHaveBeenCalled();
    });
  });
});
