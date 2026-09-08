import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as snmp from 'net-snmp';
import { AppConfig } from '../config/configuration';
import {
  DevicePollResult,
  PollableDevice,
  PortPollResult,
  SnmpProvider,
} from './snmp-provider.interface';

// Standard MIB-II / HOST-RESOURCES-MIB / IF-MIB OIDs. These are widely
// supported across vendors (Cisco, HPE/Aruba, TP-Link, Ubiquiti, ...) for
// CPU/memory/interface stats — unlike AP client counts or radio utilization,
// which have no universal OID and are genuinely vendor-specific (see the
// TODO further down).
const OID = {
  // net-snmp's session.table() expects the TABLE-level OID, not the
  // ENTRY-level OID — it appends ".1." itself to reach the entry, then the
  // column number, then the row index (i.e. it assumes
  // <table-oid>.1.<column>.<row>). Passing the entry-level OID directly
  // (as this code used to) makes every row's parsed path off-by-one, so
  // table() silently returns an empty object even though the underlying
  // SNMP walk succeeds and a plain `snmpwalk` against the same OID returns
  // real data — confirmed by testing against a real Aruba 6200F switch.
  hrProcessorTable: '1.3.6.1.2.1.25.3.3', // HOST-RESOURCES-MIB; column 2 = hrProcessorLoad
  hrStorageTable: '1.3.6.1.2.1.25.2.3', // columns: 2=Type 5=Size 6=Used
  hrStorageTypeRam: '1.3.6.1.2.1.25.2.1.2',
  ifTable: '1.3.6.1.2.1.2.2', // columns: 5=Speed 8=OperStatus 10=InOctets 16=OutOctets
};

const SNMP_TIMEOUT_MS = 8000;
const SNMP_RETRIES = 1;

interface PortCounterSample {
  timestamp: number;
  inOctets: number;
  outOctets: number;
}

@Injectable()
export class RealSnmpProvider implements SnmpProvider {
  private readonly logger = new Logger(RealSnmpProvider.name);
  private readonly defaultCommunity: string;

  // Bandwidth is a *rate*, not an instantaneous SNMP value — ifInOctets/
  // ifOutOctets are cumulative counters, so we need two samples to compute
  // Mbps. This cache holds the previous sample per "deviceId:portNumber";
  // the first poll after a restart has no baseline yet, so it reports 0.
  private readonly previousPortCounters = new Map<string, PortCounterSample>();

  constructor(config: ConfigService<AppConfig, true>) {
    this.defaultCommunity = config.get('snmp', { infer: true }).community;
  }

  async pollDevice(device: PollableDevice): Promise<DevicePollResult> {
    // Per-device override takes priority — confirmed necessary in practice:
    // two Aruba switches on the same real network turned out to be
    // configured with two different community strings, so one server-wide
    // value can't cover every device. An empty string is treated the same
    // as "not set" (falls back to the default) since that's what an
    // untouched form field submits.
    const community = device.snmpCommunity || this.defaultCommunity;
    const session = snmp.createSession(device.ipAddress, community, {
      timeout: SNMP_TIMEOUT_MS,
      retries: SNMP_RETRIES,
      version: snmp.Version2c,
    });
    // Without this, an unexpected transport-level error (e.g. ECONNRESET)
    // fires an 'error' event with no listener attached, which Node treats
    // as an uncaught exception and can crash the whole poll cycle. Logging
    // it here keeps a single bad device from taking down monitoring for
    // every other device in the same cycle.
    session.on('error', (error) => {
      this.logger.warn(
        `SNMP session error for ${device.ipAddress}: ${error.message || error}`,
      );
    });

    try {
      const [cpuUsagePercent, memoryUsagePercent] = await Promise.all([
        this.readCpuPercent(session, device),
        this.readMemoryPercent(session, device),
      ]);

      if (device.kind === 'SWITCH') {
        const ports = await this.readPorts(session, device);
        return { reachable: true, cpuUsagePercent, memoryUsagePercent, ports };
      }

      // TODO: AP bandwidth/traffic/connectedClients have no universal MIB —
      // e.g. Ubiquiti uses their own AirOS MIB, Aruba/Cisco WLCs use their
      // controller MIBs. Wire in a per-`device.brand` OID map here once
      // real access points are available to test against.
      return {
        reachable: true,
        cpuUsagePercent,
        memoryUsagePercent,
        connectedClients: 0,
        bandwidthUsagePercent: 0,
        trafficInMbps: 0,
        trafficOutMbps: 0,
      };
    } catch (error) {
      this.logger.warn(
        `Poll failed for ${device.ipAddress} (${device.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.unreachableResult(device);
    } finally {
      session.close();
    }
  }

  private unreachableResult(device: PollableDevice): DevicePollResult {
    if (device.kind === 'ACCESS_POINT') {
      return {
        reachable: false,
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
        connectedClients: 0,
        bandwidthUsagePercent: 0,
        trafficInMbps: 0,
        trafficOutMbps: 0,
      };
    }
    return {
      reachable: false,
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
      ports: device.portNumbers.map((portNumber) => ({
        portNumber,
        status: 'DOWN' as const,
        speedMbps: 0,
        bandwidthUsagePercent: 0,
        trafficInMbps: 0,
        trafficOutMbps: 0,
      })),
    };
  }

  private readCpuPercent(
    session: snmp.Session,
    device: PollableDevice,
  ): Promise<number> {
    return new Promise((resolve) => {
      session.table(OID.hrProcessorTable, 20, (error, table) => {
        if (error) {
          this.logger.warn(
            `hrProcessorTable walk failed for ${device.ipAddress}: ${error.message || error}`,
          );
          resolve(0);
          return;
        }
        if (!table || Object.keys(table).length === 0) {
          this.logger.warn(
            `hrProcessorTable returned no rows for ${device.ipAddress} — device may not expose this MIB`,
          );
          resolve(0);
          return;
        }
        const loads = Object.values(table)
          .map((row) => Number(row['2']))
          .filter((n) => Number.isFinite(n));
        if (loads.length === 0) {
          this.logger.warn(
            `hrProcessorLoad rows present but column 2 unreadable for ${device.ipAddress}`,
          );
          resolve(0);
          return;
        }
        const avg = loads.reduce((sum, n) => sum + n, 0) / loads.length;
        resolve(Math.round(avg));
      });
    });
  }

  private readMemoryPercent(
    session: snmp.Session,
    device: PollableDevice,
  ): Promise<number> {
    return new Promise((resolve) => {
      session.table(OID.hrStorageTable, 20, (error, table) => {
        if (error) {
          this.logger.warn(
            `hrStorageTable walk failed for ${device.ipAddress}: ${error.message || error}`,
          );
          resolve(0);
          return;
        }
        if (!table || Object.keys(table).length === 0) {
          this.logger.warn(
            `hrStorageTable returned no rows for ${device.ipAddress} — device may not expose this MIB`,
          );
          resolve(0);
          return;
        }
        // net-snmp's table() can return OID-typed columns (hrStorageType)
        // as a dotted-decimal string, a Buffer, or an object depending on
        // library version — normalize before comparing so RAM detection
        // doesn't silently fail (and fall back to reporting 0%) just
        // because the runtime shape wasn't a plain string.
        const ramRow = Object.values(table).find((row) =>
          normalizeOidValue(row['2']).includes(OID.hrStorageTypeRam),
        );
        if (!ramRow) {
          this.logger.warn(
            `hrStorageTable has ${Object.keys(table).length} row(s) for ${device.ipAddress} but none is type=RAM — dumping raw types: ${Object.values(
              table,
            )
              .map((row) => normalizeOidValue(row['2']))
              .join(', ')}`,
          );
          resolve(0);
          return;
        }
        const size = Number(ramRow['5']);
        const used = Number(ramRow['6']);
        if (!size) {
          this.logger.warn(
            `hrStorageTable RAM row has size=0 for ${device.ipAddress}`,
          );
          resolve(0);
          return;
        }
        resolve(Math.round((used / size) * 100));
      });
    });
  }

  private readPorts(
    session: snmp.Session,
    device: PollableDevice,
  ): Promise<PortPollResult[]> {
    return new Promise((resolve) => {
      session.table(OID.ifTable, 20, (error, table) => {
        if (error) {
          this.logger.warn(
            `ifTable walk failed for ${device.ipAddress}: ${error.message || error}`,
          );
          resolve(
            device.portNumbers.map((portNumber) => ({
              portNumber,
              status: 'DOWN' as const,
              speedMbps: 0,
              bandwidthUsagePercent: 0,
              trafficInMbps: 0,
              trafficOutMbps: 0,
            })),
          );
          return;
        }
        if (!table || Object.keys(table).length === 0) {
          this.logger.warn(
            `ifTable returned no rows for ${device.ipAddress} — device may not expose IF-MIB, or the walk was cut off before any full row was assembled`,
          );
          resolve(
            device.portNumbers.map((portNumber) => ({
              portNumber,
              status: 'DOWN' as const,
              speedMbps: 0,
              bandwidthUsagePercent: 0,
              trafficInMbps: 0,
              trafficOutMbps: 0,
            })),
          );
          return;
        }

        const now = Date.now();

        // Auto-discovery: a freshly-added switch has no Port rows yet (the
        // admin isn't expected to know/enter port numbers by hand when
        // adding a device), so `portNumbers` starts empty and there would
        // be nothing to poll on the very first cycle. Discover every "real"
        // physical port from the ifEntry table instead in that case. Some
        // platforms (confirmed on Aruba AOS-CX) also expose very large
        // synthetic ifIndex values for VLAN/LAG pseudo-interfaces (e.g.
        // 16777217, 268435456) alongside the physical ports (1..N) — those
        // aren't ports a NOC cares about here, so anything at or above this
        // threshold is filtered out.
        const MAX_PHYSICAL_PORT_INDEX = 4096;
        const portNumbers =
          device.portNumbers.length > 0
            ? device.portNumbers
            : Object.keys(table)
                .map(Number)
                .filter(
                  (n) =>
                    Number.isFinite(n) && n > 0 && n < MAX_PHYSICAL_PORT_INDEX,
                )
                .sort((a, b) => a - b);

        if (portNumbers.length === 0) {
          this.logger.warn(
            `ifTable had ${Object.keys(table).length} row(s) for ${device.ipAddress} but none survived port-number discovery — raw row keys: ${Object.keys(
              table,
            ).join(', ')}`,
          );
        }

        const results = portNumbers.map((portNumber) => {
          // Simplification: we assume ifIndex == our portNumber, which
          // holds for most simple switches but isn't guaranteed by the
          // IF-MIB spec — a production deployment may need an
          // ifIndex-to-portNumber mapping table per device model.
          const row = table[String(portNumber)];
          if (!row) {
            this.logger.warn(
              `Expected ifEntry row for port ${portNumber} on ${device.ipAddress} but table had no matching index`,
            );
            return {
              portNumber,
              status: 'DOWN' as const,
              speedMbps: 0,
              bandwidthUsagePercent: 0,
              trafficInMbps: 0,
              trafficOutMbps: 0,
            };
          }

          const operStatus = Number(row['8']);
          const speedMbps = Math.round(Number(row['5']) / 1_000_000);
          const status: 'UP' | 'DOWN' = operStatus === 1 ? 'UP' : 'DOWN';
          const inOctets = Number(row['10']);
          const outOctets = Number(row['16']);
          // ifDescr (column 2) — the device's own name for this port, e.g.
          // "GigabitEthernet1/0/1". Comes along for free since we're
          // already walking the whole ifTable row; normalized the same way
          // as hrStorageType earlier in this file, since net-snmp can hand
          // this back as a Buffer depending on the device/library version.
          const name = normalizeOidValue(row['2']) || undefined;

          const cacheKey = `${device.id}:${portNumber}`;
          const previous = this.previousPortCounters.get(cacheKey);
          this.previousPortCounters.set(cacheKey, {
            timestamp: now,
            inOctets,
            outOctets,
          });

          let trafficInMbps = 0;
          let trafficOutMbps = 0;
          if (previous && status === 'UP') {
            const deltaSeconds = (now - previous.timestamp) / 1000;
            if (deltaSeconds > 0) {
              trafficInMbps = bytesDeltaToMbps(
                inOctets - previous.inOctets,
                deltaSeconds,
              );
              trafficOutMbps = bytesDeltaToMbps(
                outOctets - previous.outOctets,
                deltaSeconds,
              );
            }
          }

          const bandwidthUsagePercent =
            speedMbps > 0
              ? Math.min(
                  100,
                  Math.round(
                    (Math.max(trafficInMbps, trafficOutMbps) / speedMbps) * 100,
                  ),
                )
              : 0;

          return {
            portNumber,
            name,
            status,
            speedMbps,
            bandwidthUsagePercent,
            trafficInMbps,
            trafficOutMbps,
          };
        });

        resolve(results);
      });
    });
  }
}

function bytesDeltaToMbps(deltaBytes: number, deltaSeconds: number): number {
  if (deltaBytes < 0) return 0; // counter wrapped/reset
  const bitsPerSecond = (deltaBytes * 8) / deltaSeconds;
  return Math.round(bitsPerSecond / 1_000_000);
}

// net-snmp represents OID-valued columns (e.g. hrStorageType) inconsistently
// across versions/transports — sometimes a dotted-decimal string, sometimes
// a Buffer of raw bytes, sometimes an object with a toString(). Coerce to a
// plain string safely so `.includes()` comparisons against a known OID
// don't silently fail (and get misread as "value not found" -> 0%).
function normalizeOidValue(value: unknown): string {
  if (value == null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (
    typeof value === 'object' &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    const stringified = (value as { toString(): string }).toString();

    // guarding against the useless default Object.prototype.toString() output here,
    // since net-snmp may hand back plain objects for OID-typed columns.
    return stringified === '[object Object]' ? '' : stringified;
  }
  return '';
}
