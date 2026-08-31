import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import {
  buildZoneSummaries,
  DeviceForSummary,
  ZoneSummary,
} from './zone-summary.util';

interface ZoneRecord {
  id: string;
  name: string;
}

// Prisma's unique-constraint violation error code.
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function isPrismaKnownError(
  error: unknown,
): error is { code: string; meta?: { target?: string[] } } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  private fetchAllDevicesForSummary(): Promise<DeviceForSummary[]> {
    return this.prisma.device.findMany({
      select: { zoneId: true, kind: true, status: true, severity: true },
    });
  }

  async findAll(): Promise<ZoneSummary[]> {
    const [zones, devices] = await Promise.all([
      this.prisma.zone.findMany({ orderBy: { name: 'asc' } }) as Promise<
        ZoneRecord[]
      >,
      this.fetchAllDevicesForSummary(),
    ]);
    return buildZoneSummaries(zones, devices);
  }

  async findOne(id: string): Promise<ZoneSummary> {
    const zone = (await this.prisma.zone.findUnique({
      where: { id },
    })) as ZoneRecord | null;
    if (!zone) throw new NotFoundException(`Zone "${id}" not found`);

    const devices = await this.fetchAllDevicesForSummary();
    return buildZoneSummaries([zone], devices)[0];
  }

  async create(dto: CreateZoneDto): Promise<ZoneSummary> {
    try {
      const zone = (await this.prisma.zone.create({
        data: { name: dto.name },
      })) as ZoneRecord;
      return buildZoneSummaries([zone], [])[0];
    } catch (error) {
      if (
        isPrismaKnownError(error) &&
        error.code === PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException('A zone with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateZoneDto): Promise<ZoneSummary> {
    try {
      const zone = (await this.prisma.zone.update({
        where: { id },
        data: { name: dto.name },
      })) as ZoneRecord;
      const devices = await this.fetchAllDevicesForSummary();
      return buildZoneSummaries([zone], devices)[0];
    } catch (error) {
      if (
        isPrismaKnownError(error) &&
        error.code === PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException('A zone with this name already exists');
      }
      if (isPrismaKnownError(error) && error.code === 'P2025') {
        throw new NotFoundException(`Zone "${id}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.zone.delete({ where: { id } });
    } catch (error) {
      if (isPrismaKnownError(error) && error.code === 'P2025') {
        throw new NotFoundException(`Zone "${id}" not found`);
      }
      throw error;
    }
  }
}
