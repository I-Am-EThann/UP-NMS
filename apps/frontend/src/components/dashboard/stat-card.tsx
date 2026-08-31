import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "normal" | "critical" | "brand";
  caption?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-brand-50 text-ink-600",
  brand: "bg-brand-100 text-brand-700",
  normal: "bg-sev-normal-bg text-sev-normal",
  critical: "bg-sev-critical-bg text-sev-critical",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  caption,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 py-5">
        <div>
          <p className="text-xs font-medium text-ink-400">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink-900">
            {value.toLocaleString("en-US")}
          </p>
          {caption && (
            <p className="mt-1 font-mono text-[11px] text-ink-400">{caption}</p>
          )}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            toneStyles[tone]
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
