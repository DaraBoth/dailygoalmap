import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/**
 * AI encodes charts as a fenced code block:
 *
 * ```chart
 * {
 *   "type": "bar" | "line" | "pie",
 *   "title": "Chart title",
 *   "data": [{ "name": "Alice", "value": 5 }, ...],
 *   "xKey": "name",
 *   "yKey": "value",        // bar/line only
 *   "series": [             // optional multi-series for bar/line
 *     { "key": "done", "label": "Completed", "color": "#22c55e" },
 *     { "key": "total", "label": "Total", "color": "#3b82f6" }
 *   ]
 * }
 * ```
 */

interface SeriesDef {
  key: string;
  label?: string;
  color?: string;
}

interface ChartSpec {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: Record<string, string | number>[];
  xKey?: string;
  yKey?: string;
  series?: SeriesDef[];
}

const PALETTE = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#10b981', '#6366f1',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export const ChartRenderer: React.FC<{ raw: string }> = ({ raw }) => {
  const spec = useMemo<ChartSpec | null>(() => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.type || !Array.isArray(parsed.data)) return null;
      return parsed as ChartSpec;
    } catch {
      return null;
    }
  }, [raw]);

  if (!spec) {
    return (
      <pre className="text-xs text-muted-foreground bg-muted rounded p-3 overflow-x-auto">
        {raw}
      </pre>
    );
  }

  const xKey = spec.xKey || 'name';
  const yKey = spec.yKey || 'value';
  const series: SeriesDef[] = spec.series?.length
    ? spec.series
    : [{ key: yKey, label: yKey, color: PALETTE[0] }];

  return (
    <div className="my-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {spec.title && (
        <p className="text-sm font-semibold text-foreground mb-3">{spec.title}</p>
      )}

      <ResponsiveContainer width="100%" height={240}>
        {spec.type === 'pie' ? (
          <PieChart>
            <Pie
              data={spec.data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {spec.data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : spec.type === 'line' ? (
          <LineChart data={spec.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'currentColor' }} />
            <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label || s.key}
                stroke={s.color || PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={spec.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'currentColor' }} />
            <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label || s.key}
                fill={s.color || PALETTE[i % PALETTE.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
