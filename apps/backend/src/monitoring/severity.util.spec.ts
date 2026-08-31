import { computeDeviceSeverity } from './severity.util';

describe('computeDeviceSeverity', () => {
  it('is always CRITICAL when unreachable, regardless of usage numbers', () => {
    expect(
      computeDeviceSeverity({
        reachable: false,
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
      }),
    ).toBe('CRITICAL');
  });

  it.each([
    [10, 20, undefined, 'NORMAL'],
    [55, 20, undefined, 'WARNING'],
    [20, 72, undefined, 'MAJOR'],
    [20, 20, 90, 'CRITICAL'],
    [90, 10, 10, 'CRITICAL'],
  ] as const)('cpu=%s mem=%s bw=%s -> %s', (cpu, mem, bw, expected) => {
    expect(
      computeDeviceSeverity({
        reachable: true,
        cpuUsagePercent: cpu,
        memoryUsagePercent: mem,
        bandwidthUsagePercent: bw,
      }),
    ).toBe(expected);
  });

  it('takes the worst of cpu/memory/bandwidth, not an average', () => {
    // avg would be ~35 (NORMAL), but memory alone is CRITICAL
    expect(
      computeDeviceSeverity({
        reachable: true,
        cpuUsagePercent: 5,
        memoryUsagePercent: 95,
        bandwidthUsagePercent: 5,
      }),
    ).toBe('CRITICAL');
  });

  it('treats a missing bandwidth reading as 0 (e.g. switches with no AP bandwidth field)', () => {
    expect(
      computeDeviceSeverity({
        reachable: true,
        cpuUsagePercent: 10,
        memoryUsagePercent: 10,
      }),
    ).toBe('NORMAL');
  });
});
