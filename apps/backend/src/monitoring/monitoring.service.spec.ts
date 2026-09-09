import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { InfluxService } from '../influx/influx.service';
import { SNMP_PROVIDER } from '../snmp/snmp-provider.interface';
import { DEVICE_METRICS_UPDATED_EVENT } from '../realtime/realtime.events';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  let service: MonitoringService;

  const deviceFindMany = jest.fn();
  const deviceFindUnique = jest.fn();
  const deviceUpdate = jest.fn();
  const portUpsert = jest.fn();
  const alertCreate = jest.fn();
  const writeDeviceMetric = jest.fn();
  const flush = jest.fn();
  const pollDevice = jest.fn();
  const emit = jest.fn();

  const baseSwitch = {
    id: 'd1',
    zoneId: 'z1',
    kind: 'SWITCH' as const,
    ipAddress: '10.0.0.1',
    brand: 'Cisco',
    severity: 'NORMAL' as const,
    ports: [{ portNumber: 1 }],
  };

  const baseAp = {
    id: 'd2',
    zoneId: 'z1',
    kind: 'ACCESS_POINT' as const,
    ipAddress: '10.0.0.2',
    brand: 'Ubiquiti',
    severity: 'NORMAL' as const,
    ports: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    deviceUpdate.mockResolvedValue({});
    portUpsert.mockResolvedValue({});
    alertCreate.mockResolvedValue({});
    flush.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: PrismaService,
          useValue: {
            device: {
              findMany: deviceFindMany,
              findUnique: deviceFindUnique,
              update: deviceUpdate,
            },
            port: { upsert: portUpsert },
            alert: { create: alertCreate },
          },
        },
        { provide: InfluxService, useValue: { writeDeviceMetric, flush } },
        { provide: EventEmitter2, useValue: { emit } },
        { provide: SNMP_PROVIDER, useValue: { pollDevice } },
      ],
    }).compile();

    service = moduleRef.get(MonitoringService);
  });

  it('writes a metric point to InfluxDB for every successfully polled device', async () => {
    deviceFindMany.mockResolvedValue([baseSwitch, baseAp]);
    pollDevice.mockResolvedValue({
      reachable: true,
      cpuUsagePercent: 20,
      memoryUsagePercent: 30,
    });

    const result = await service.pollAllDevices();

    expect(result.polled).toBe(2);
    expect(result.failed).toBe(0);
    expect(writeDeviceMetric).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('creates an Alert row when a device transitions to a worse severity', async () => {
    deviceFindMany.mockResolvedValue([baseSwitch]);
    pollDevice.mockResolvedValue({
      reachable: false,
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
      ports: [
        {
          portNumber: 1,
          status: 'DOWN',
          speedMbps: 0,
          bandwidthUsagePercent: 0,
          trafficInMbps: 0,
          trafficOutMbps: 0,
        },
      ],
    });

    const result = await service.pollAllDevices();

    expect(result.alertsCreated).toBe(1);
    expect(alertCreate).toHaveBeenCalledWith({
      data: {
        zoneId: 'z1',
        deviceId: 'd1',
        severity: 'CRITICAL',
        messageKey: 'DEVICE_OFFLINE',
      },
    });
    expect(writeDeviceMetric).toHaveBeenCalledTimes(1);
  });

  it('upserts port rows for a switch based on the poll result', async () => {
    deviceFindMany.mockResolvedValue([baseSwitch]);
    pollDevice.mockResolvedValue({
      reachable: true,
      cpuUsagePercent: 20,
      memoryUsagePercent: 30,
      ports: [
        {
          portNumber: 1,
          status: 'UP',
          speedMbps: 1000,
          bandwidthUsagePercent: 40,
          trafficInMbps: 60,
          trafficOutMbps: 20,
        },
      ],
    });

    await service.pollAllDevices();

    expect(portUpsert).toHaveBeenCalledTimes(1);
    expect(portUpsert.mock.calls[0][0].where).toEqual({
      deviceId_portNumber: { deviceId: 'd1', portNumber: 1 },
    });
  });

  it('counts a device as failed and keeps going when polling throws', async () => {
    deviceFindMany.mockResolvedValue([baseSwitch, baseAp]);
    pollDevice
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({
        reachable: true,
        cpuUsagePercent: 10,
        memoryUsagePercent: 10,
      });

    const result = await service.pollAllDevices();

    expect(result).toEqual({ polled: 2, failed: 1, alertsCreated: 0 });
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('flushes InfluxDB exactly once per pollAllDevices() call, even with zero devices', async () => {
    deviceFindMany.mockResolvedValue([]);
    await service.pollAllDevices();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(writeDeviceMetric).not.toHaveBeenCalled();
  });

  it('emits a device.metrics.updated event with the polled snapshot, including ports for switches', async () => {
    deviceFindMany.mockResolvedValue([baseSwitch]);
    pollDevice.mockResolvedValue({
      reachable: true,
      cpuUsagePercent: 20,
      memoryUsagePercent: 30,
      ports: [
        {
          portNumber: 1,
          status: 'UP',
          speedMbps: 1000,
          bandwidthUsagePercent: 40,
          trafficInMbps: 60,
          trafficOutMbps: 20,
        },
      ],
    });

    await service.pollAllDevices();

    expect(emit).toHaveBeenCalledWith(
      DEVICE_METRICS_UPDATED_EVENT,
      expect.objectContaining({
        deviceId: 'd1',
        zoneId: 'z1',
        status: 'ONLINE',
        severity: 'NORMAL',
        ports: [expect.objectContaining({ portNumber: 1, status: 'UP' })],
      }),
    );
  });

  it('omits ports in the emitted event for an access point', async () => {
    deviceFindMany.mockResolvedValue([baseAp]);
    pollDevice.mockResolvedValue({
      reachable: true,
      cpuUsagePercent: 15,
      memoryUsagePercent: 25,
      connectedClients: 10,
    });

    await service.pollAllDevices();

    expect(emit).toHaveBeenCalledWith(
      DEVICE_METRICS_UPDATED_EVENT,
      expect.objectContaining({ deviceId: 'd2', ports: undefined }),
    );
  });

  describe('pollDeviceById', () => {
    it('polls, applies, and flushes for a single existing device', async () => {
      deviceFindUnique.mockResolvedValue(baseSwitch);
      pollDevice.mockResolvedValue({
        reachable: true,
        cpuUsagePercent: 42,
        memoryUsagePercent: 55,
      });

      await service.pollDeviceById('d1');

      expect(deviceFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'd1' } }),
      );
      expect(pollDevice).toHaveBeenCalledTimes(1);
      expect(deviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({ cpuUsagePercent: 42 }),
        }),
      );
      expect(flush).toHaveBeenCalledTimes(1);
    });

    it('does nothing (and does not throw) if the device was deleted before this ran', async () => {
      deviceFindUnique.mockResolvedValue(null);

      await expect(service.pollDeviceById('gone')).resolves.toBeUndefined();

      expect(pollDevice).not.toHaveBeenCalled();
      expect(flush).not.toHaveBeenCalled();
    });

    it('swallows a poll failure instead of throwing, so a caller can safely fire-and-forget', async () => {
      deviceFindUnique.mockResolvedValue(baseSwitch);
      pollDevice.mockRejectedValue(new Error('timeout'));

      await expect(service.pollDeviceById('d1')).resolves.toBeUndefined();
    });
  });

  describe('primeDeviceHistory', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('polls the requested number of times, waiting intervalMs between each', async () => {
      deviceFindUnique.mockResolvedValue(baseSwitch);
      pollDevice.mockResolvedValue({
        reachable: true,
        cpuUsagePercent: 10,
        memoryUsagePercent: 20,
      });

      const done = service.primeDeviceHistory('d1', 3, 15_000);

      // First poll happens immediately, without waiting on any timer.
      await Promise.resolve();
      await Promise.resolve();
      expect(deviceFindUnique).toHaveBeenCalledTimes(1);

      // Advancing past each interval should trigger exactly one more poll —
      // not a burst of extra calls, and not fewer than expected.
      await jest.advanceTimersByTimeAsync(15_000);
      expect(deviceFindUnique).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(15_000);
      expect(deviceFindUnique).toHaveBeenCalledTimes(3);

      await done;
      // No trailing wait after the last attempt — three attempts means
      // exactly two 15s gaps, not three.
      expect(pollDevice).toHaveBeenCalledTimes(3);
    });

    it('defaults to 3 attempts 15 seconds apart when not specified', async () => {
      deviceFindUnique.mockResolvedValue(baseSwitch);
      pollDevice.mockResolvedValue({
        reachable: true,
        cpuUsagePercent: 10,
        memoryUsagePercent: 20,
      });

      const done = service.primeDeviceHistory('d1');
      await jest.advanceTimersByTimeAsync(30_000);
      await done;

      expect(pollDevice).toHaveBeenCalledTimes(3);
    });

    it('stops cleanly (no throw) if the device gets deleted partway through the burst', async () => {
      deviceFindUnique
        .mockResolvedValueOnce(baseSwitch)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      pollDevice.mockResolvedValue({
        reachable: true,
        cpuUsagePercent: 10,
        memoryUsagePercent: 20,
      });

      const done = service.primeDeviceHistory('d1', 3, 15_000);
      await jest.advanceTimersByTimeAsync(30_000);

      await expect(done).resolves.toBeUndefined();
      expect(pollDevice).toHaveBeenCalledTimes(1); // only the first attempt found a real device
    });
  });
});
