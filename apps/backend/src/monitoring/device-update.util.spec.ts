import { buildDeviceUpdate } from './device-update.util';

describe('buildDeviceUpdate', () => {
  it('marks status OFFLINE and creates a DEVICE_OFFLINE alert when severity worsens to CRITICAL via unreachability', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: false,
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
    });

    expect(update.status).toBe('OFFLINE');
    expect(update.severity).toBe('CRITICAL');
    expect(update.newAlert).toEqual({
      severity: 'CRITICAL',
      messageKey: 'DEVICE_OFFLINE',
    });
  });

  it('does not create an alert when severity stays NORMAL', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: true,
      cpuUsagePercent: 20,
      memoryUsagePercent: 20,
    });
    expect(update.severity).toBe('NORMAL');
    expect(update.newAlert).toBeNull();
  });

  it('does not create an alert when severity stays the same (no worsening) even if still non-normal', () => {
    const update = buildDeviceUpdate('WARNING', {
      reachable: true,
      cpuUsagePercent: 55,
      memoryUsagePercent: 20,
    });
    expect(update.severity).toBe('WARNING');
    expect(update.newAlert).toBeNull();
  });

  it('does not create an alert when severity improves', () => {
    const update = buildDeviceUpdate('CRITICAL', {
      reachable: true,
      cpuUsagePercent: 10,
      memoryUsagePercent: 10,
    });
    expect(update.severity).toBe('NORMAL');
    expect(update.newAlert).toBeNull();
  });

  it('creates a HIGH_BANDWIDTH alert when bandwidth is the worst offender and severity worsened', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: true,
      cpuUsagePercent: 10,
      memoryUsagePercent: 10,
      bandwidthUsagePercent: 90,
    });
    expect(update.newAlert).toEqual({
      severity: 'CRITICAL',
      messageKey: 'HIGH_BANDWIDTH',
    });
  });

  it('creates a HIGH_MEMORY alert when memory is the worst offender', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: true,
      cpuUsagePercent: 10,
      memoryUsagePercent: 92,
      bandwidthUsagePercent: 10,
    });
    expect(update.newAlert).toEqual({
      severity: 'CRITICAL',
      messageKey: 'HIGH_MEMORY',
    });
  });

  it('creates a HIGH_CPU alert when cpu is the worst offender and severity worsened', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: true,
      cpuUsagePercent: 95,
      memoryUsagePercent: 10,
      bandwidthUsagePercent: 10,
    });
    expect(update.severity).toBe('CRITICAL');
    expect(update.newAlert).toEqual({
      severity: 'CRITICAL',
      messageKey: 'HIGH_CPU',
    });
  });

  it('passes through AP-only fields untouched', () => {
    const update = buildDeviceUpdate('NORMAL', {
      reachable: true,
      cpuUsagePercent: 10,
      memoryUsagePercent: 10,
      connectedClients: 42,
      bandwidthUsagePercent: 30,
      trafficInMbps: 55,
      trafficOutMbps: 20,
    });
    expect(update.connectedClients).toBe(42);
    expect(update.trafficInMbps).toBe(55);
    expect(update.trafficOutMbps).toBe(20);
  });
});
