import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  const alertFindMany = jest.fn();

  const rowFactory = (
    overrides: Partial<{
      id: string;
      zoneId: string;
      deviceId: string;
      severity: 'NORMAL' | 'WARNING' | 'MAJOR' | 'CRITICAL';
      messageKey: string;
      createdAt: Date;
    }> = {},
  ) => ({
    id: 'a1',
    zoneId: 'z1',
    deviceId: 'd1',
    severity: 'CRITICAL' as const,
    messageKey: 'DEVICE_OFFLINE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    zone: { name: 'Zone One' },
    device: { name: 'SW-1', kind: 'SWITCH' as const },
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: { alert: { findMany: alertFindMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(AlertsService);
  });

  it('maps rows into the flattened AlertListItem shape', async () => {
    alertFindMany.mockResolvedValue([rowFactory()]);

    const result = await service.findAll({});

    expect(result).toEqual([
      {
        id: 'a1',
        zoneId: 'z1',
        zoneName: 'Zone One',
        deviceId: 'd1',
        deviceName: 'SW-1',
        deviceKind: 'SWITCH',
        severity: 'CRITICAL',
        messageKey: 'DEVICE_OFFLINE',
        createdAt: rowFactory().createdAt,
      },
    ]);
  });

  it('passes zoneId/deviceId/severity filters through to the Prisma where clause', async () => {
    alertFindMany.mockResolvedValue([]);

    await service.findAll({
      zoneId: 'z1',
      deviceId: 'd1',
      severity: 'CRITICAL',
    });

    expect(alertFindMany.mock.calls[0][0].where).toEqual({
      zoneId: 'z1',
      deviceId: 'd1',
      severity: 'CRITICAL',
    });
  });

  it('omits filter keys entirely when not provided', async () => {
    alertFindMany.mockResolvedValue([]);
    await service.findAll({});
    expect(alertFindMany.mock.calls[0][0].where).toEqual({});
  });

  it('sorts Critical-first and applies the default limit', async () => {
    alertFindMany.mockResolvedValue([
      rowFactory({ id: 'normal', severity: 'NORMAL' }),
      rowFactory({ id: 'critical', severity: 'CRITICAL' }),
    ]);

    const result = await service.findAll({});
    expect(result.map((r) => r.id)).toEqual(['critical', 'normal']);
  });

  it('caps results at the requested limit', async () => {
    alertFindMany.mockResolvedValue([
      rowFactory({ id: 'a' }),
      rowFactory({ id: 'b' }),
      rowFactory({ id: 'c' }),
    ]);

    const result = await service.findAll({ limit: 2 });
    expect(result).toHaveLength(2);
  });
});
