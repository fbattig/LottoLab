"use client";

interface PositionalEntry {
  position: number;
  topNumbers: { number: number; frequency: number; percentage: number }[];
}

export default function PositionalHeatmap({
  data,
}: {
  data: PositionalEntry[];
}) {
  const maxFreq = Math.max(
    ...data.flatMap((d) => d.topNumbers.map((n) => n.frequency))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border">
            <th className="p-2 text-left text-xs text-muted">Position</th>
            {[1, 2, 3, 4, 5].map((rank) => (
              <th key={rank} className="p-2 text-center text-xs text-muted">
                #{rank}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.position} className="border-b border-card-border/50">
              <td className="p-2 text-xs font-semibold">
                {row.position}
                {row.position === 1
                  ? "st"
                  : row.position === 2
                  ? "nd"
                  : row.position === 3
                  ? "rd"
                  : "th"}
              </td>
              {row.topNumbers.slice(0, 5).map((entry, i) => {
                const intensity = maxFreq > 0 ? entry.frequency / maxFreq : 0;
                return (
                  <td key={i} className="p-2 text-center">
                    <div
                      className="inline-flex flex-col items-center justify-center w-14 h-14 rounded-lg"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${
                          0.1 + intensity * 0.5
                        })`,
                      }}
                    >
                      <span className="text-sm font-bold">{entry.number}</span>
                      <span className="text-[10px] text-muted">
                        {entry.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
