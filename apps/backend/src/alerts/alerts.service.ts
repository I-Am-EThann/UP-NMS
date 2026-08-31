import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Severity } from '../monitoring/severity.util';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { sortAlerts } from './sort-alerts.util';

const DEFAULT_LIMIT = 100;

export interface AlertListItem {
  id: string;
  zoneId: string;
  zoneName: string;
  deviceId: string;
  deviceName: string;
  deviceKind: 'SWITCH' | 'ACCESS_POINT';
  severity: Severity;
  messageKey: string;
  createdAt: Date;
}

interface AlertRow {
  id: string;
  zoneId: string;
  deviceId: string;
  severity: Severity;
  messageKey: string;
  createdAt: Date;
  zone: { name: string };
  device: { name: string; kind: 'SWITCH' | 'ACCESS_POINT' };
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListAlertsQueryDto): Promise<AlertListItem[]> {
    const rows: AlertRow[] = await this.prisma.alert.findMany({
      where: {
        ...(query.zoneId ? { zoneId: query.zoneId } : {}),
        ...(query.deviceId ? { deviceId: query.deviceId } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
      },
      include: {
        zone: { select: { name: true } },
        device: { select: { name: true, kind: true } },
      },
    });

    const mapped: AlertListItem[] = rows.map((row) => ({
      id: row.id,
      zoneId: row.zoneId,
      zoneName: row.zone.name,
      deviceId: row.deviceId,
      deviceName: row.device.name,
      deviceKind: row.device.kind,
      severity: row.severity,
      messageKey: row.messageKey,
      createdAt: row.createdAt,
    }));

    const limit = query.limit ?? DEFAULT_LIMIT;
    return sortAlerts(mapped).slice(0, limit);
  }
}
