import { buildZoneSummaries } from './zone-summary.util';

describe('buildZoneSummaries', () => {
  it('computes counts and severity buckets from the device list', () => {
    const zones = [{ id: 'z1', name: 'Zone One' }];
    const devices = [
      {
        zoneId: 'z1',
        kind: 'SWITCH' as const,
        status: 'ONLINE' as const,
        severity: 'NORMAL' as const,
      },
      {
        zoneId: 'z1',
        kind: 'SWITCH' as const,
        status: 'OFFLINE' as const,
        severity: 'CRITICAL' as const,
      },
      {
        zoneId: 'z1',
        kind: 'ACCESS_POINT' as const,
        status: 'ONLINE' as const,
        severity: 'WARNING' as const,
      },
    ];

    const [summary] = buildZoneSummaries(zones, devices);

    expect(summary).toEqual({
      id: 'z1',
      name: 'Zone One',
      switchCount: 2,
      accessPointCount: 1,
      onlineCount: 2,
      offlineCount: 1,
      alertCounts: { critical: 1, major: 0, warning: 1, normal: 1 },
    });
  });

  it('returns a zero summary for a zone with no devices', () => {
    const [summary] = buildZoneSummaries([{ id: 'z2', name: 'Empty' }], []);
    expect(summary.switchCount).toBe(0);
    expect(summary.accessPointCount).toBe(0);
    expect(summary.alertCounts).toEqual({
      critical: 0,
      major: 0,
      warning: 0,
      normal: 0,
    });
  });

  it('ignores devices belonging to other zones', () => {
    const zones = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const devices = [
      {
        zoneId: 'a',
        kind: 'SWITCH' as const,
        status: 'ONLINE' as const,
        severity: 'NORMAL' as const,
      },
      {
        zoneId: 'b',
        kind: 'SWITCH' as const,
        status: 'ONLINE' as const,
        severity: 'NORMAL' as const,
      },
    ];

    const summaries = buildZoneSummaries(zones, devices);
    expect(summaries.find((s) => s.id === 'a')?.switchCount).toBe(1);
    expect(summaries.find((s) => s.id === 'b')?.switchCount).toBe(1);
  });
});
