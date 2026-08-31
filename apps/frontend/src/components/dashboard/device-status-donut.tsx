"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { OverviewTotals } from "@/lib/stats";
import { useLocale } from "@/lib/i18n/locale-context";

export function DeviceStatusDonut({ totals }: { totals: OverviewTotals }) {
  const { t } = useLocale();
  const total = totals.totalOnline + totals.totalOffline;
  const data = [
    { name: "Online", value: totals.totalOnline, color: "var(--sev-normal)" },
    { name: "Offline", value: totals.totalOffline, color: "var(--sev-offline)" },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={86}
            paddingAngle={data[1].value > 0 ? 3 : 0}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-2xl font-semibold text-ink-900">
          {total.toLocaleString("en-US")}
        </p>
        <p className="text-[11px] text-ink-400">{t.dashboard.totalDevices}</p>
      </div>
    </div>
  );
}
