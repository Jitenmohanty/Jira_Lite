'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Validated categorical pair (see dataviz validator): indigo vs green,
// CVD-safe and in the dark lightness band. Legend + fills = secondary encoding.
const CREATED = '#5E6AD2';
const COMPLETED = '#3E9D68';

const shortDay = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export function ThroughputChart({
  data,
}: {
  data: { day: string; created: number; completed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CREATED} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CREATED} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COMPLETED} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COMPLETED} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }}
          stroke="rgb(var(--border))"
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }}
          stroke="rgb(var(--border))"
          width={40}
        />
        <Tooltip
          labelFormatter={(v) => shortDay(String(v))}
          contentStyle={{
            background: 'rgb(var(--surface-elevated))',
            border: '1px solid rgb(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'rgb(var(--muted))' }}
        />
        <Legend
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }}
        />
        <Area
          type="monotone"
          dataKey="created"
          name="Created"
          stroke={CREATED}
          strokeWidth={2}
          fill="url(#gCreated)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke={COMPLETED}
          strokeWidth={2}
          fill="url(#gCompleted)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
