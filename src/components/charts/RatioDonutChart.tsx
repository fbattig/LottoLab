"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

interface DataPoint {
  ratio: string;
  count: number;
  percentage: number;
}

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f5b731",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
];

export default function RatioDonutChart({
  data,
  title,
}: {
  data: DataPoint[];
  title: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-center mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="count"
            nameKey="ratio"
            label={(props: PieLabelRenderProps) => {
              const name = props.name ?? "";
              const pct = typeof props.percent === "number" ? props.percent : 0;
              return `${name} (${(pct * 100).toFixed(1)}%)`;
            }}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#131c31",
              border: "1px solid #1e2d4a",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${value} draws`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
