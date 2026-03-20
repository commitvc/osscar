"use client";

import { useState, useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeSeriesPoint } from "@/types";
import { formatCompact, cn } from "@/lib/utils";

export type MetricConfig = {
  key: string;
  label: string;
  data: TimeSeriesPoint[];
  color: string;
  periodLabel: string;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  color: string;
  periodLabel: string;
}

function CustomTooltip({ active, payload, label, color, periodLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (value == null) return null;

  const date = new Date(label as string);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-popover border border-white/10 rounded-lg px-3 py-2.5 shadow-xl">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {formatted}
      </p>
      <p className="font-mono text-sm font-bold" style={{ color }}>
        {formatCompact(value)}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
        {periodLabel}
      </p>
    </div>
  );
}

interface GrowthChartProps {
  metrics: MetricConfig[];
}

export function GrowthChart({ metrics }: GrowthChartProps) {
  const id = useId();
  const available = metrics.filter((m) => m.data.length > 0);
  const [activeKey, setActiveKey] = useState(available[0]?.key ?? "");

  const current = available.find((m) => m.key === activeKey) ?? available[0];

  if (!current || available.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground/40 uppercase tracking-widest">
          No trend data available
        </p>
      </div>
    );
  }

  const gradientId = `gradient-${id}-${current.key}`;

  const tickInterval = Math.max(1, Math.floor(current.data.length / 6));

  return (
    <div className="space-y-4">
      {/* Metric toggle */}
      <div className="flex flex-wrap gap-2">
        {available.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveKey(m.key)}
            className={cn(
              "px-3 py-1 rounded-full font-mono text-[0.65rem] uppercase tracking-wider transition-all border cursor-pointer",
              activeKey === m.key
                ? "border-transparent font-semibold text-background"
                : "border-white/15 text-muted-foreground hover:text-foreground hover:border-white/30"
            )}
            style={activeKey === m.key ? { backgroundColor: m.color } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={current.data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={current.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={current.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString("en-US", { month: "short" })
            }
            tick={{
              fontSize: 10,
              fill: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval={tickInterval}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompact(v)}
            tick={{
              fontSize: 10,
              fill: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            content={
              <CustomTooltip
                color={current.color}
                periodLabel={current.periodLabel}
              />
            }
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={current.color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: current.color,
              stroke: "rgba(0,0,0,0.5)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
