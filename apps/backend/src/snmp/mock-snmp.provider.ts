import { Injectable } from '@nestjs/common';
import {
  DevicePollResult,
  PollableDevice,
  PortPollResult,
  SnmpProvider,
} from './snmp-provider.interface';

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

// A small, stable-ish fraction of devices simulate being down on any given
// poll, so the mock data feels alive without being pure noise.
const UNREACHABLE_CHANCE = 0.05;

@Injectable()
export class MockSnmpProvider implements SnmpProvider {
  pollDevice(device: PollableDevice): Promise<DevicePollResult> {
    const reachable = Math.random() > UNREACHABLE_CHANCE;

    if (!reachable) {
      return Promise.resolve({
        reachable: false,
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
        ...(device.kind === 'ACCESS_POINT'
          ? {
              connectedClients: 0,
              bandwidthUsagePercent: 0,
              trafficInMbps: 0,
              trafficOutMbps: 0,
            }
          : { ports: device.portNumbers.map((n) => downPort(n)) }),
      });
    }

    const base: DevicePollResult = {
      reachable: true,
      cpuUsagePercent: randomInRange(10, 60),
      memoryUsagePercent: randomInRange(20, 70),
    };

    if (device.kind === 'ACCESS_POINT') {
      return Promise.resolve({
        ...base,
        connectedClients: randomInRange(5, 90),
        bandwidthUsagePercent: randomInRange(10, 90),
        trafficInMbps: randomInRange(10, 200),
        trafficOutMbps: randomInRange(5, 100),
      });
    }

    return Promise.resolve({
      ...base,
      ports: device.portNumbers.map((n) => upPort(n)),
    });
  }
}

function upPort(portNumber: number): PortPollResult {
  return {
    portNumber,
    name: `GigabitEthernet1/0/${portNumber}`,
    status: 'UP',
    speedMbps: 1000,
    bandwidthUsagePercent: randomInRange(15, 80),
    trafficInMbps: randomInRange(10, 150),
    trafficOutMbps: randomInRange(5, 80),
  };
}

function downPort(portNumber: number): PortPollResult {
  return {
    portNumber,
    name: `GigabitEthernet1/0/${portNumber}`,
    status: 'DOWN',
    speedMbps: 0,
    bandwidthUsagePercent: 0,
    trafficInMbps: 0,
    trafficOutMbps: 0,
  };
}
