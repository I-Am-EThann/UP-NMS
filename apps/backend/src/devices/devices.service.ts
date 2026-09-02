import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

function isPrismaKnownError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoring: MonitoringService,
  ) {}

  private async assertZoneExists(zoneId: string): Promise<void> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new NotFoundException(`Zone "${zoneId}" not found`);
  }

  async findAllByZone(zoneId: string, kind?: 'SWITCH' | 'ACCESS_POINT') {
    await this.assertZoneExists(zoneId);
    return this.prisma.device.findMany({
      where: { zoneId, ...(kind ? { kind } : {}) },
      include: { ports: { orderBy: { portNumber: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { ports: { orderBy: { portNumber: 'asc' } } },
    });
    if (!device) throw new NotFoundException(`Device "${id}" not found`);
    return device;
  }

  async create(zoneId: string, dto: CreateDeviceDto) {
    await this.assertZoneExists(zoneId);

    const base = {
      zoneId,
      kind: dto.kind,
      name: dto.name,
      ipAddress: dto.ipAddress,
      brand: dto.brand,
      model: dto.model,
      imageUrl: dto.imageUrl || undefined,
      snmpCommunity: dto.snmpCommunity || null,
      mapLat: dto.mapLat,
      mapLng: dto.mapLng,
      status: 'ONLINE' as const,
      severity: 'NORMAL' as const,
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
      ...(dto.kind === 'ACCESS_POINT'
        ? {
            connectedClients: 0,
            bandwidthUsagePercent: 0,
            trafficInMbps: 0,
            trafficOutMbps: 0,
          }
        : {}),
    };

    try {
      const device = await this.prisma.device.create({
        data: base,
        include: { ports: true },
      });
      const deviceId: string = device.id;
      // Fire-and-forget: don't make the person wait for an SNMP round-trip
      // (up to the 8s timeout, or a full retry) just to see their new
      // device appear. pollDeviceById never throws — a failure here just
      // means the device sits at its 0%/placeholder defaults until the
      // next scheduled poll, exactly as it did before this feature existed.
      this.monitoring.pollDeviceById(deviceId).catch((error: unknown) => {
        this.logger.warn(
          `Unexpected error from immediate poll of new device ${deviceId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
      return device;
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2002') {
        throw new ConflictException('Another device already uses this IP');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDeviceDto) {
    try {
      return await this.prisma.device.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.ipAddress !== undefined ? { ipAddress: dto.ipAddress } : {}),
          ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
          ...(dto.model !== undefined ? { model: dto.model } : {}),
          ...(dto.imageUrl !== undefined
            ? { imageUrl: dto.imageUrl || null }
            : {}),
          ...(dto.snmpCommunity !== undefined
            ? { snmpCommunity: dto.snmpCommunity || null }
            : {}),
          ...(dto.mapLat !== undefined ? { mapLat: dto.mapLat } : {}),
          ...(dto.mapLng !== undefined ? { mapLng: dto.mapLng } : {}),
        },
        include: { ports: { orderBy: { portNumber: 'asc' } } },
      });
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2002') {
        throw new ConflictException('Another device already uses this IP');
      }
      if (isPrismaKnownError(error) && error.code === 'P2025') {
        throw new NotFoundException(`Device "${id}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.device.delete({ where: { id } });
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2025') {
        throw new NotFoundException(`Device "${id}" not found`);
      }
      throw error;
    }
  }
}
