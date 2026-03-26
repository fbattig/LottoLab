"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from "recharts";

interface DataPoint {
  sum: number;
  count: number;
}

interface Props {
  data: DataPoint[];
  optimalLow: number;
  optimalHigh: number;
}

export default function SumHistogram({ data, optimalLow, optimalHigh }: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <ReferenceArea
          x1={optimalLow}
          x2={optimalHigh}
          fill="#22c55e"
          fillOpacity={0.1}
          strokeOpacity={0}
        />
        <XAxis
          dataKey="sum"
          tick={{ fill: "#64748b", fontSize: 10 }}
          interval="preserveStartEnd"
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
          formatter={(value) => [String(value), "Draws"]}
          labelFormatter={(label) => `Sum: ${label}`}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.sum >= optimalLow && entry.sum <= optimalHigh
                  ? "#22c55e"
                  : "#3b82f6"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
