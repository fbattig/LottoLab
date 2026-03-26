"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DataPoint {
  number: number;
  frequency: number;
  classification: "HOT" | "WARM" | "COLD";
}

const COLORS = {
  HOT: "#22c55e",
  WARM: "#f5b731",
  COLD: "#ef4444",
};

export default function FrequencyBarChart({ data }: { data: DataPoint[] }) {
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
          formatter={(value) => [String(value), "Frequency"]}
          labelFormatter={(label) => `Number ${label}`}
        />
        <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[entry.classification]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
