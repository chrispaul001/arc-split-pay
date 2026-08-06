import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  filled = false,
}: {
  data: number[];
  className?: string;
  filled?: boolean;
}) {
  const w = 100;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = `spark-${data.length}-${Math.round(max)}-${Math.round(min)}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--electric)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled && <path d={area} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke="var(--electric)"
        strokeWidth={filled ? 1.4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={1.8}
        fill="var(--mint)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
