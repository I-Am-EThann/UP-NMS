import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  let service: DevicesService;
  const zoneFindUnique = jest.fn();
  const deviceFindMany = jest.fn();
  const deviceFindUnique = jest.fn();
  const deviceCreate = jest.fn();
  const deviceUpdate = jest.fn();
  const deviceDelete = jest.fn();
  const pollDeviceById = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    pollDeviceById.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: PrismaService,
          useValue: {
            zone: { findUnique: zoneFindUnique },
            device: {
              findMany: deviceFindMany,
              findUnique: deviceFindUnique,
              create: deviceCreate,
              update: deviceUpdate,
              delete: deviceDelete,
            },
          },
        },
        { provide: MonitoringService, useValue: { pollDeviceById } },
      ],
    }).compile();

    service = moduleRef.get(DevicesService);
  });

  describe('create', () => {
    it('throws NotFoundException when the zone does not exist', async () => {
      zoneFindUnique.mockResolvedValue(null);
      await expect(
        service.create('missing-zone', {
          kind: 'SWITCH',
          name: 'SW-1',
          ipAddress: '10.0.0.1',
          brand: 'Cisco',
          model: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deviceCreate).not.toHaveBeenCalled();
    });

    it('creates a SWITCH with online/normal defaults and no AP-only fields', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd1' });

      await service.create('z1', {
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: '10.0.0.1',
        brand: 'Cisco',
        model: 'X',
      });

      const dataArg = deviceCreate.mock.calls[0][0].data;
      expect(dataArg.status).toBe('ONLINE');
      expect(dataArg.severity).toBe('NORMAL');
      expect(dataArg.cpuUsagePercent).toBe(0);
      expect(dataArg.connectedClients).toBeUndefined();
    });

    it('stores a per-device SNMP community override when provided', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd1' });

      await service.create('z1', {
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: '10.0.0.1',
        brand: 'Cisco',
        model: 'X',
        snmpCommunity: 'snmp@UPManage',
      });

      expect(deviceCreate.mock.calls[0][0].data.snmpCommunity).toBe(
        'snmp@UPManage',
      );
    });

    it('normalizes a blank SNMP community to null so the server default applies', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd1' });

      await service.create('z1', {
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: '10.0.0.1',
        brand: 'Cisco',
        model: 'X',
        snmpCommunity: '',
      });

      expect(deviceCreate.mock.calls[0][0].data.snmpCommunity).toBeNull();
    });

    it('creates an ACCESS_POINT with zeroed AP-only fields', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd2' });

      await service.create('z1', {
        kind: 'ACCESS_POINT',
        name: 'AP-1',
        ipAddress: '10.0.0.2',
        brand: 'Ubiquiti',
        model: 'Y',
      });

      const dataArg = deviceCreate.mock.calls[0][0].data;
      expect(dataArg.connectedClients).toBe(0);
      expect(dataArg.bandwidthUsagePercent).toBe(0);
    });

    it('throws ConflictException when the IP is already in use', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create('z1', {
          kind: 'SWITCH',
          name: 'SW-1',
          ipAddress: '10.0.0.1',
          brand: 'Cisco',
          model: 'X',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('triggers an immediate poll of the new device without waiting for it', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd1' });
      // Never resolves — proves create() doesn't await the poll.
      pollDeviceById.mockReturnValue(new Promise(() => {}));

      const result = await service.create('z1', {
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: '10.0.0.1',
        brand: 'Cisco',
        model: 'X',
      });

      expect(result).toEqual({ id: 'd1' });
      expect(pollDeviceById).toHaveBeenCalledWith('d1');
    });

    it('does not let a failed immediate poll surface as a create() error', async () => {
      zoneFindUnique.mockResolvedValue({ id: 'z1', name: 'Zone' });
      deviceCreate.mockResolvedValue({ id: 'd1' });
      pollDeviceById.mockRejectedValue(new Error('device unreachable'));

      await expect(
        service.create('z1', {
          kind: 'SWITCH',
          name: 'SW-1',
          ipAddress: '10.0.0.1',
          brand: 'Cisco',
          model: 'X',
        }),
      ).resolves.toEqual({ id: 'd1' });
    });
  });

  describe('update', () => {
    it('throws NotFoundException for a missing device', async () => {
      deviceUpdate.mockRejectedValue({ code: 'P2025' });
      await expect(
        service.update('missing', { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException on duplicate IP', async () => {
      deviceUpdate.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.update('d1', { ipAddress: '10.0.0.9' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('only sends provided fields to Prisma', async () => {
      deviceUpdate.mockResolvedValue({ id: 'd1', name: 'Renamed' });
      await service.update('d1', { name: 'Renamed' });
      expect(deviceUpdate.mock.calls[0][0].data).toEqual({ name: 'Renamed' });
    });

    it('updates the SNMP community override and normalizes blank to null', async () => {
      deviceUpdate.mockResolvedValue({ id: 'd1' });
      await service.update('d1', { snmpCommunity: 'snmp@UPManage' });
      expect(deviceUpdate.mock.calls[0][0].data).toEqual({
        snmpCommunity: 'snmp@UPManage',
      });

      deviceUpdate.mockClear();
      await service.update('d1', { snmpCommunity: '' });
      expect(deviceUpdate.mock.calls[0][0].data).toEqual({
        snmpCommunity: null,
      });
    });

    it('clears imageUrl to null when the frontend sends an empty string (remove-image button)', async () => {
      // Regression test — confirmed bug: the remove-image button used to
      // reset local state to `undefined`, which network-data-context.tsx's
      // updateDevice() treats as "field not touched" and never sends over
      // the wire at all. The frontend now sends "" instead to signal an
      // explicit removal; this asserts the backend actually clears it.
      deviceUpdate.mockResolvedValue({ id: 'd1' });
      await service.update('d1', { imageUrl: '' });
      expect(deviceUpdate.mock.calls[0][0].data).toEqual({ imageUrl: null });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      deviceFindUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      deviceDelete.mockRejectedValue({ code: 'P2025' });
      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
