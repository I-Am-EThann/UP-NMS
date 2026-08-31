"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { computeSeverityTotals } from "@/lib/stats";
import { Zone } from "@/lib/types";

export function SeverityOverviewChart({ zones }: { zones: Zone[] }) {
  const data = computeSeverityTotals(zones);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
        barCategoryGap={14}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          width={72}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "var(--ink-600)" }}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.level} fill={entry.color} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "var(--ink-900)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
