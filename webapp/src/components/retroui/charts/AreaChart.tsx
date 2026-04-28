'use client';

import React, { useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface AreaChartProps<T extends Record<string, unknown>> {
  data: T[];
  index: keyof T;
  categories: (keyof T)[];
  /** Optional height in pixels */
  height?: number;
  /** Show growth percentage from first to last value */
  showGrowth?: boolean;
  /** Sparkline only: no axes, no grid, just the area curve */
  sparkline?: boolean;
}

const COLORS = ['var(--primary)', 'var(--accent)', 'var(--primary-hover)'];

type TooltipPayloadItem = { name: string; value: number; dataKey: string; color: string };
type ChartTooltipProps = {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[] | TooltipPayloadItem[];
  label?: string | number;
  categoryLabel?: string | number;
};

function ChartTooltipContent({ active, payload, label, categoryLabel = 'Value' }: Readonly<ChartTooltipProps>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const name = String(payload[0]?.dataKey ?? categoryLabel);
  return (
    <div
      className="px-3 py-2 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] font-sans"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--foreground)',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label != null && <div style={{ marginBottom: 4 }}>{label}</div>}
      <div>
        {name}: <strong>{value}</strong>
      </div>
    </div>
  );
}

type RechartsTooltipArgs = {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[] | TooltipPayloadItem[];
  label?: string | number;
};

function createAreaChartTooltipContent(categoryLabel: string) {
  function RechartsAreaTooltip(props: Readonly<RechartsTooltipArgs>) {
    return (
      <ChartTooltipContent
        active={props.active}
        payload={props.payload}
        label={props.label}
        categoryLabel={categoryLabel}
      />
    );
  }
  RechartsAreaTooltip.displayName = 'RechartsAreaTooltip';
  return RechartsAreaTooltip;
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  index,
  categories,
  height = 200,
  showGrowth = false,
  sparkline = false,
}: Readonly<AreaChartProps<T>>) {
  const firstVal = data[0]?.[categories[0]];
  const lastRow = data.at(-1);
  const lastVal = lastRow?.[categories[0]];
  const numFirst = typeof firstVal === 'number' ? firstVal : 0;
  const numLast = typeof lastVal === 'number' ? lastVal : 0;
  let growthPct = 0;
  if (numFirst > 0) {
    growthPct = Math.round(((numLast - numFirst) / numFirst) * 100);
  } else if (numLast > 0) {
    growthPct = 100;
  }

  const uniqueId = React.useId().replaceAll(':', '');
  const category0Label = String(categories[0]);
  const TooltipContentComponent = useMemo(
    () => createAreaChartTooltipContent(category0Label),
    [category0Label],
  );

  if (sparkline) {
    return (
      <div className="w-full" style={{ minHeight: height }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsAreaChart
            data={data}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <defs>
              {categories.map((cat, i) => (
                <linearGradient key={String(cat)} id={`area-spark-${uniqueId}-${String(cat)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <Tooltip content={TooltipContentComponent} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            {categories.map((cat, i) => (
              <Area
                key={String(cat)}
                type="monotone"
                dataKey={String(cat)}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                fill={`url(#area-spark-${uniqueId}-${String(cat)})`}
                isAnimationActive
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showGrowth && (
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <span className={growthPct >= 0 ? 'text-primary' : 'text-destructive'}>
            {growthPct >= 0 ? '+' : ''}{growthPct}% growth
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            {categories.map((cat, i) => (
              <linearGradient key={String(cat)} id={`area-${String(cat)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={String(index)}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
          />
          <Tooltip content={TooltipContentComponent} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          {categories.map((cat, i) => (
            <Area
              key={String(cat)}
              type="monotone"
              dataKey={String(cat)}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              fill={`url(#area-${String(cat)})`}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
