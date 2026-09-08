import { MockSnmpProvider } from './mock-snmp.provider';

describe('MockSnmpProvider', () => {
  let provider: MockSnmpProvider;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new MockSnmpProvider();
  });

  afterEach(() => {
    randomSpy?.mockRestore();
  });

  it('returns plausible metrics for a SWITCH when reachable', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // > UNREACHABLE_CHANCE

    const result = await provider.pollDevice({
      id: 'd1',
      ipAddress: '10.0.0.1',
      kind: 'SWITCH',
      brand: 'Cisco',
      portNumbers: [1, 2, 3],
    });

    expect(result.reachable).toBe(true);
    expect(result.cpuUsagePercent).toBeGreaterThanOrEqual(0);
    expect(result.cpuUsagePercent).toBeLessThanOrEqual(100);
    expect(result.ports).toHaveLength(3);
    expect(result.ports?.map((p) => p.portNumber)).toEqual([1, 2, 3]);
    expect(result.connectedClients).toBeUndefined();
  });

  it('returns plausible metrics for an ACCESS_POINT when reachable', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await provider.pollDevice({
      id: 'd2',
      ipAddress: '10.0.0.2',
      kind: 'ACCESS_POINT',
      brand: 'Aruba',
      portNumbers: [],
    });

    expect(result.reachable).toBe(true);
    expect(result.connectedClients).toBeGreaterThanOrEqual(0);
    expect(result.bandwidthUsagePercent).toBeGreaterThanOrEqual(0);
    expect(result.ports).toBeUndefined();
  });

  it('simulates an unreachable device and zeroes everything out', async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.001); // < UNREACHABLE_CHANCE

    const result = await provider.pollDevice({
      id: 'd3',
      ipAddress: '10.0.0.3',
      kind: 'SWITCH',
      brand: 'HPE',
      portNumbers: [1, 2],
    });

    expect(result.reachable).toBe(false);
    expect(result.cpuUsagePercent).toBe(0);
    expect(result.ports).toEqual([
      {
        portNumber: 1,
        name: 'GigabitEthernet1/0/1',
        status: 'DOWN',
        speedMbps: 0,
        bandwidthUsagePercent: 0,
        trafficInMbps: 0,
        trafficOutMbps: 0,
      },
      {
        portNumber: 2,
        name: 'GigabitEthernet1/0/2',
        status: 'DOWN',
        speedMbps: 0,
        bandwidthUsagePercent: 0,
        trafficInMbps: 0,
        trafficOutMbps: 0,
      },
    ]);
  });
});
