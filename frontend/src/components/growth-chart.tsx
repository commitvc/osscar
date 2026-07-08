"use client";

import { useEffect, useRef, useState, useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TimeSeriesPoint } from "@/types";
import { formatCompact, cn } from "@/lib/utils";

const CHART_HEIGHT = 336;

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
  quarterStart: string;
  quarterEnd: string;
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.round(element.getBoundingClientRect().width);
      setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export function GrowthChart({ metrics, quarterStart, quarterEnd }: GrowthChartProps) {
  const id = useId();
  const [chartBoxRef, chartWidth] = useMeasuredWidth();
  const available = metrics
    .map((metric) => ({
      ...metric,
      data: metric.data.filter((point) => point.date >= quarterStart && point.date <= quarterEnd),
    }))
    .filter((metric) => metric.data.length > 0);
  const [activeKey, setActiveKey] = useState(available[0]?.key ?? "");

  const current = available.find((m) => m.key === activeKey) ?? available[0];

  if (!current || available.length === 0) {
    return (
      <div
        className="h-[280px] flex items-center justify-center"
        data-testid="growth-chart-empty"
      >
        <p className="font-mono text-xs text-muted-foreground/40 uppercase tracking-widest">
          No trend data available
        </p>
      </div>
    );
  }

  const gradientId = `gradient-${id}-${current.key}`;
  const filteredData = current.data;

  const tickInterval = Math.max(1, Math.floor(filteredData.length / 6));

  return (
    <div
      className="space-y-4"
      data-testid="growth-chart"
      data-active-key={current.key}
      data-active-point-count={filteredData.length}
    >
      {/* Metric toggle */}
      <div className="flex flex-wrap gap-2">
        {available.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveKey(m.key)}
            data-testid={`growth-chart-toggle-${m.key}`}
            className={cn(
              "px-3 py-1 rounded-full font-mono text-[0.65rem] uppercase tracking-wider transition-all border cursor-pointer",
              current.key === m.key
                ? "border-transparent font-semibold text-background"
                : "border-white/15 text-muted-foreground hover:text-foreground hover:border-white/30"
            )}
            style={current.key === m.key ? { backgroundColor: m.color } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        ref={chartBoxRef}
        className="h-[336px] w-full"
        data-testid="growth-chart-renderer"
      >
        {chartWidth > 0 && (
          <AreaChart
            width={chartWidth}
            height={CHART_HEIGHT}
            data={filteredData}
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
                fontSize: 11,
                fill: "rgba(255,255,255,0.55)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompact(v)}
              tick={{
                fontSize: 11,
                fill: "rgba(255,255,255,0.55)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, "auto"]}
              allowDecimals={false}
              tickCount={6}
              scale="linear"
              type="number"
              interval="preserveStartEnd"
              ticks={(() => {
                const maxVal = Math.max(...filteredData.map(d => d.value));
                const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
                const step = steps.find(s => maxVal / s <= 6) ?? steps[steps.length - 1];
                const ticks: number[] = [];
                for (let v = 0; v <= maxVal + step; v += step) {
                  ticks.push(v);
                  if (v >= maxVal) break;
                }
                return ticks;
              })()}
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
              type="linear"
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
        )}
      </div>
    </div>
  );
}
