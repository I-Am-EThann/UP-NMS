import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ZonesService } from './zones.service';

describe('ZonesService', () => {
  let service: ZonesService;
  const zoneFindMany = jest.fn();
  const zoneFindUnique = jest.fn();
  const zoneCreate = jest.fn();
  const zoneUpdate = jest.fn();
  const zoneDelete = jest.fn();
  const deviceFindMany = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ZonesService,
        {
          provide: PrismaService,
          useValue: {
            zone: {
              findMany: zoneFindMany,
              findUnique: zoneFindUnique,
              create: zoneCreate,
              update: zoneUpdate,
              delete: zoneDelete,
            },
            device: { findMany: deviceFindMany },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ZonesService);
  });

  it('findAll() returns zones with computed summaries', async () => {
    zoneFindMany.mockResolvedValue([{ id: 'z1', name: 'Zone One' }]);
    deviceFindMany.mockResolvedValue([
      { zoneId: 'z1', kind: 'SWITCH', status: 'OFFLINE', severity: 'CRITICAL' },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      {
        id: 'z1',
        name: 'Zone One',
        switchCount: 1,
        accessPointCount: 0,
        onlineCount: 0,
        offlineCount: 1,
        alertCounts: { critical: 1, major: 0, warning: 0, normal: 0 },
      },
    ]);
  });

  it('findOne() throws NotFoundException for a missing zone', async () => {
    zoneFindUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() throws ConflictException on duplicate name', async () => {
    zoneCreate.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create({ name: 'Existing Zone' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create() returns a zero-count summary for a brand new zone', async () => {
    zoneCreate.mockResolvedValue({ id: 'z2', name: 'New Zone' });
    const result = await service.create({ name: 'New Zone' });
    expect(result).toEqual({
      id: 'z2',
      name: 'New Zone',
      switchCount: 0,
      accessPointCount: 0,
      onlineCount: 0,
      offlineCount: 0,
      alertCounts: { critical: 0, major: 0, warning: 0, normal: 0 },
    });
  });

  it('remove() throws NotFoundException when the zone does not exist', async () => {
    zoneDelete.mockRejectedValue({ code: 'P2025' });
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() resolves when deletion succeeds', async () => {
    zoneDelete.mockResolvedValue({ id: 'z1' });
    await expect(service.remove('z1')).resolves.toBeUndefined();
  });
});
