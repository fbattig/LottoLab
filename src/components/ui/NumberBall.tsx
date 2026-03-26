"use client";

const DECADE_COLORS: Record<number, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-yellow-500 text-gray-900",
  3: "bg-green-500",
  4: "bg-blue-500",
};

function getDecadeColor(n: number): string {
  const decade = Math.floor((n - 1) / 10);
  return DECADE_COLORS[decade] ?? "bg-purple-500";
}

interface NumberBallProps {
  number: number;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
  bonus?: boolean;
}

const SIZES = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base font-bold",
};

export default function NumberBall({
  number,
  size = "md",
  highlight = false,
  bonus = false,
}: NumberBallProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full font-semibold
        ${SIZES[size]}
        ${bonus ? "bg-accent-gold text-gray-900" : getDecadeColor(number)}
        ${highlight ? "ring-2 ring-accent-gold ring-offset-2 ring-offset-background" : ""}
      `}
    >
      {number}
    </span>
  );
}
