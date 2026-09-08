import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PollableDevice, SNMP_PROVIDER } from '../snmp/snmp-provider.interface';
import type { SnmpProvider } from '../snmp/snmp-provider.interface';
import { InfluxService } from '../influx/influx.service';
import { DEVICE_METRICS_UPDATED_EVENT } from '../realtime/realtime.events';
import { buildDeviceUpdate } from './device-update.util';
import { Severity } from './severity.util';

interface DeviceRow {
  id: string;
  zoneId: string;
  kind: 'SWITCH' | 'ACCESS_POINT';
  ipAddress: string;
  brand: string;
  severity: Severity;
  snmpCommunity: string | null;
  ports: { portNumber: number }[];
}

export interface PollAllResult {
  polled: number;
  failed: number;
  alertsCreated: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly influx: InfluxService,
    private readonly events: EventEmitter2,
    @Inject(SNMP_PROVIDER) private readonly snmp: SnmpProvider,
  ) {}

  /**
   * Polls a single device immediately, outside the normal scheduled cycle.
   * Intended to be called (fire-and-forget) right after a device is
   * created, so the UI doesn't sit at 0%/placeholder values for up to a
   * full SNMP_POLL_INTERVAL_MS — without this, a device added right after
   * a scheduled poll just ran has to wait almost the entire interval
   * before its first real reading shows up anywhere.
   *
   * Never throws: a failure here (unreachable device, SNMP timeout, device
   * deleted again before this runs) is logged and swallowed rather than
   * surfaced, since by design nothing awaits this call's result — the
   * device creation response has already gone back to the client by the
   * time this runs, and the normal scheduled poll will pick the device up
   * again regardless of whether this one-off attempt succeeded.
   */
  async pollDeviceById(deviceId: string): Promise<void> {
    const device: DeviceRow | null = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        zoneId: true,
        kind: true,
        ipAddress: true,
        brand: true,
        severity: true,
        snmpCommunity: true,
        ports: { select: { portNumber: true } },
      },
    });
    if (!device) return; // deleted again before this ran — nothing to do

    try {
      await this.pollAndApply(device);
      await this.influx.flush();
    } catch (error) {
      this.logger.warn(
        `Immediate poll failed for newly-added device ${device.id} (${device.ipAddress}) — will retry on the next scheduled cycle: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async pollAllDevices(): Promise<PollAllResult> {
    const devices: DeviceRow[] = await this.prisma.device.findMany({
      select: {
        id: true,
        zoneId: true,
        kind: true,
        ipAddress: true,
        brand: true,
        severity: true,
        snmpCommunity: true,
        ports: { select: { portNumber: true } },
      },
    });

    let failed = 0;
    let alertsCreated = 0;

    await Promise.all(
      devices.map(async (device) => {
        try {
          const created = await this.pollAndApply(device);
          if (created) alertsCreated += 1;
        } catch (error) {
          failed += 1;
          this.logger.warn(
            `Failed to poll/apply device ${device.id} (${device.ipAddress}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );

    await this.influx.flush();

    this.logger.log(
      `Polled ${devices.length} device(s), ${failed} failed, ${alertsCreated} new alert(s)`,
    );
    return { polled: devices.length, failed, alertsCreated };
  }

  /** Returns true if a new Alert row was created. */
  private async pollAndApply(device: DeviceRow): Promise<boolean> {
    const pollable: PollableDevice = {
      id: device.id,
      ipAddress: device.ipAddress,
      kind: device.kind,
      brand: device.brand,
      snmpCommunity: device.snmpCommunity,
      portNumbers: device.ports.map((p) => p.portNumber),
    };

    const pollResult = await this.snmp.pollDevice(pollable);
    const update = buildDeviceUpdate(device.severity, pollResult);

    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: update.status,
        severity: update.severity,
        cpuUsagePercent: update.cpuUsagePercent,
        memoryUsagePercent: update.memoryUsagePercent,
        lastUpdate: new Date(),
        ...(device.kind === 'ACCESS_POINT'
          ? {
              connectedClients: update.connectedClients,
              bandwidthUsagePercent: update.bandwidthUsagePercent,
              trafficInMbps: update.trafficInMbps,
              trafficOutMbps: update.trafficOutMbps,
            }
          : {}),
      },
    });

    if (device.kind === 'SWITCH' && pollResult.ports) {
      await Promise.all(
        pollResult.ports.map((port) =>
          this.prisma.port.upsert({
            where: {
              deviceId_portNumber: {
                deviceId: device.id,
                portNumber: port.portNumber,
              },
            },
            update: {
              status: port.status,
              name: port.name,
              speedMbps: port.speedMbps,
              bandwidthUsagePercent: port.bandwidthUsagePercent,
              trafficInMbps: port.trafficInMbps,
              trafficOutMbps: port.trafficOutMbps,
            },
            create: {
              deviceId: device.id,
              portNumber: port.portNumber,
              name: port.name,
              status: port.status,
              speedMbps: port.speedMbps,
              bandwidthUsagePercent: port.bandwidthUsagePercent,
              trafficInMbps: port.trafficInMbps,
              trafficOutMbps: port.trafficOutMbps,
            },
          }),
        ),
      );
    }

    if (update.newAlert) {
      await this.prisma.alert.create({
        data: {
          zoneId: device.zoneId,
          deviceId: device.id,
          severity: update.newAlert.severity,
          messageKey: update.newAlert.messageKey,
        },
      });
    }

    this.influx.writeDeviceMetric({
      deviceId: device.id,
      zoneId: device.zoneId,
      kind: device.kind,
      cpuUsagePercent: update.cpuUsagePercent,
      memoryUsagePercent: update.memoryUsagePercent,
      bandwidthUsagePercent: update.bandwidthUsagePercent,
      trafficInMbps: update.trafficInMbps,
      trafficOutMbps: update.trafficOutMbps,
      connectedClients: update.connectedClients,
    });

    this.events.emit(DEVICE_METRICS_UPDATED_EVENT, {
      deviceId: device.id,
      zoneId: device.zoneId,
      status: update.status,
      severity: update.severity,
      cpuUsagePercent: update.cpuUsagePercent,
      memoryUsagePercent: update.memoryUsagePercent,
      connectedClients: update.connectedClients,
      bandwidthUsagePercent: update.bandwidthUsagePercent,
      trafficInMbps: update.trafficInMbps,
      trafficOutMbps: update.trafficOutMbps,
      ports: device.kind === 'SWITCH' ? pollResult.ports : undefined,
      timestamp: new Date().toISOString(),
    });

    return update.newAlert !== null;
  }
}
