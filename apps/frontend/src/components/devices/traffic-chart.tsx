"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrafficPoint } from "@/lib/live-metrics";
import { useLocale } from "@/lib/i18n/locale-context";

export function TrafficChart({ history }: { history: TrafficPoint[] }) {
  const { t } = useLocale();

  if (history.length < 2) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-ink-400">
        {t.trafficChart.collecting}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="trafficIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-600)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand-600)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trafficOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sev-normal)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--sev-normal)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--ink-400)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--ink-400)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          unit=" Mbps"
        />
        <Tooltip
          contentStyle={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
          }}
        />
        <Area
          type="monotone"
          dataKey="in"
          name="Traffic In"
          stroke="var(--brand-600)"
          fill="url(#trafficIn)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="out"
          name="Traffic Out"
          stroke="var(--sev-normal)"
          fill="url(#trafficOut)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
