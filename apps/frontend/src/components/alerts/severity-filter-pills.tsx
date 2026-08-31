"use client";

import { cn } from "@/lib/utils";
import { SeverityLevel } from "@/lib/types";
import { SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/stats";
import { useLocale } from "@/lib/i18n/locale-context";

const activeStyle: Record<SeverityLevel, string> = {
  critical: "bg-sev-critical-bg text-sev-critical ring-1 ring-sev-critical/30",
  major: "bg-sev-major-bg text-sev-major ring-1 ring-sev-major/30",
  warning: "bg-sev-warning-bg text-sev-warning ring-1 ring-sev-warning/30",
  normal: "bg-sev-normal-bg text-sev-normal ring-1 ring-sev-normal/30",
};

export function SeverityFilterPills({
  value,
  onChange,
  counts,
}: {
  value: SeverityLevel | "all";
  onChange: (value: SeverityLevel | "all") => void;
  counts: Record<SeverityLevel, number>;
}) {
  const total = SEVERITY_ORDER.reduce((sum, level) => sum + counts[level], 0);
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          value === "all"
            ? "bg-brand-100 text-brand-900 ring-1 ring-brand-500/30"
            : "text-ink-400 hover:bg-brand-50"
        )}
      >
        {t.alerts.all} {total}
      </button>
      {SEVERITY_ORDER.map((level) => {
        const count = counts[level];
        if (count === 0) return null;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              value === level ? activeStyle[level] : "text-ink-400 hover:bg-brand-50"
            )}
          >
            {SEVERITY_LABEL[level]} {count}
          </button>
        );
      })}
    </div>
  );
}
