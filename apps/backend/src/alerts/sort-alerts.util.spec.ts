import { sortAlerts } from './sort-alerts.util';

describe('sortAlerts', () => {
  it('orders Critical -> Major -> Warning -> Normal regardless of input order', () => {
    const alerts = [
      {
        id: 'a',
        severity: 'NORMAL' as const,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'b',
        severity: 'CRITICAL' as const,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'c',
        severity: 'WARNING' as const,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'd',
        severity: 'MAJOR' as const,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];

    const sorted = sortAlerts(alerts).map((a) => a.id);
    expect(sorted).toEqual(['b', 'd', 'c', 'a']);
  });

  it('breaks ties within the same severity by most-recent-first', () => {
    const alerts = [
      {
        id: 'old',
        severity: 'CRITICAL' as const,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'new',
        severity: 'CRITICAL' as const,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    ];

    const sorted = sortAlerts(alerts).map((a) => a.id);
    expect(sorted).toEqual(['new', 'old']);
  });

  it('does not mutate the input array', () => {
    const alerts = [
      { id: 'a', severity: 'NORMAL' as const, createdAt: new Date() },
      { id: 'b', severity: 'CRITICAL' as const, createdAt: new Date() },
    ];
    const original = [...alerts];
    sortAlerts(alerts);
    expect(alerts).toEqual(original);
  });
});
