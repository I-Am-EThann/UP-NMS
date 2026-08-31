import { cn } from "@/lib/utils";

function toneForPercent(percent: number) {
  if (percent >= 85) return { bar: "bg-sev-critical", text: "text-sev-critical" };
  if (percent >= 70) return { bar: "bg-sev-major", text: "text-sev-major" };
  if (percent >= 50) return { bar: "bg-sev-warning", text: "text-sev-warning" };
  return { bar: "bg-sev-normal", text: "text-sev-normal" };
}

export function UsageBar({
  label,
  percent,
  caption,
}: {
  label: string;
  percent: number;
  caption?: string;
}) {
  const tone = toneForPercent(percent);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-ink-400">{label}</p>
        <p className={cn("font-mono text-sm font-semibold", tone.text)}>
          {Math.round(percent)}%
        </p>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-50">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {caption && <p className="mt-1 font-mono text-[11px] text-ink-400">{caption}</p>}
    </div>
  );
}
