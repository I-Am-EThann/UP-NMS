import { Severity, severityRank } from '../monitoring/severity.util';

export interface SortableAlert {
  severity: Severity;
  createdAt: Date;
}

/** Critical -> Normal first, then most-recent-first within the same severity. */
export function sortAlerts<T extends SortableAlert>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => {
    const rankDiff = severityRank(b.severity) - severityRank(a.severity);
    if (rankDiff !== 0) return rankDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
