"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface SkipDataPoint {
  number: number;
  currentSkip: number;
  avgSkip: number;
  isDue: boolean;
}

export default function SkipLineChart({ data }: { data: SkipDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis
          dataKey="number"
          tick={{ fill: "#64748b", fontSize: 10 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "#131c31",
            border: "1px solid #1e2d4a",
            borderRadius: 8,
            color: "#e2e8f0",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            String(value),
            name === "currentSkip" ? "Current Skip" : "Avg Skip",
          ]}
          labelFormatter={(label) => `Number ${label}`}
        />
        <Bar dataKey="currentSkip" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isDue ? "#f5b731" : "#3b82f6"}
            />
          ))}
        </Bar>
        <Bar dataKey="avgSkip" fill="#64748b" opacity={0.4} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
