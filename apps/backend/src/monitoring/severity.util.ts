export type Severity = 'NORMAL' | 'WARNING' | 'MAJOR' | 'CRITICAL';

// Same thresholds as apps/frontend/src/components/devices/usage-bar.tsx
// toneForPercent() — keeping these in lockstep means a device's stored
// severity always matches the color its usage bars would show.
function severityForPercent(percent: number): Severity {
  if (percent >= 85) return 'CRITICAL';
  if (percent >= 70) return 'MAJOR';
  if (percent >= 50) return 'WARNING';
  return 'NORMAL';
}

const SEVERITY_RANK: Record<Severity, number> = {
  NORMAL: 0,
  WARNING: 1,
  MAJOR: 2,
  CRITICAL: 3,
};

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

function worstOf(...severities: Severity[]): Severity {
  return severities.reduce((worst, current) =>
    SEVERITY_RANK[current] > SEVERITY_RANK[worst] ? current : worst,
  );
}

export interface SeverityInput {
  reachable: boolean;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  bandwidthUsagePercent?: number;
}

/**
 * A device offline is always CRITICAL (matches the frontend/seed-data
 * convention). Otherwise severity is the worst of CPU/memory/bandwidth
 * utilization against the shared thresholds above.
 */
export function computeDeviceSeverity(input: SeverityInput): Severity {
  if (!input.reachable) return 'CRITICAL';

  return worstOf(
    severityForPercent(input.cpuUsagePercent),
    severityForPercent(input.memoryUsagePercent),
    severityForPercent(input.bandwidthUsagePercent ?? 0),
  );
}
