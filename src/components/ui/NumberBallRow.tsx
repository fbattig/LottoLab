"use client";

import NumberBall from "./NumberBall";

interface NumberBallRowProps {
  numbers: number[];
  bonus?: number;
  size?: "sm" | "md" | "lg";
  highlightNumbers?: Set<number>;
}

export default function NumberBallRow({
  numbers,
  bonus,
  size = "sm",
  highlightNumbers,
}: NumberBallRowProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {numbers.map((n, i) => (
        <NumberBall
          key={i}
          number={n}
          size={size}
          highlight={highlightNumbers?.has(n)}
        />
      ))}
      {bonus !== undefined && (
        <>
          <span className="text-muted mx-1">+</span>
          <NumberBall
            number={bonus}
            size={size}
            bonus
            highlight={highlightNumbers?.has(bonus)}
          />
        </>
      )}
    </div>
  );
}
