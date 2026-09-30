import { useId, useState, type PointerEvent } from "react";

export type TrendPoint = { timestamp: number; value: number };

export function MetricTrend({ points, format, label }: {
  points: TrendPoint[]; format: (value: number) => string; label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const values = points.length > 1 ? points : [{ timestamp: Date.now() - 3600000, value: 0 }, { timestamp: Date.now(), value: 0 }];
  const max = Math.max(0, ...values.map((p) => p.value));
  const min = Math.min(0, ...values.map((p) => p.value));
  const span = Math.max(1, max - min);
  const xy = values.map((p, i) => [i / (values.length - 1) * 100, 29 - (p.value - min) / span * 26] as const);
  const path = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(values.length - 1, Math.round((event.clientX - rect.left) / rect.width * (values.length - 1)))));
  };
  const selected = active === null ? null : values[active];
  return (
    <div className="relative h-12 w-32 max-w-[45%] shrink-0 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="img" aria-label={`${label} trend, latest ${format(values[values.length - 1]?.value ?? 0)}`}
      tabIndex={0} onPointerMove={onPointer} onPointerDown={onPointer}
      onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
      onFocus={() => setActive(values.length - 1)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          setActive((i) => Math.max(0, Math.min(values.length - 1, (i ?? values.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
        }
      }}>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--electric)" stopOpacity="0" />
        </linearGradient></defs>
        <path d={`${path} L100,32 L0,32 Z`} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke="var(--electric)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {active !== null && <circle cx={xy[active]?.[0] ?? 0} cy={xy[active]?.[1] ?? 0} r="2" fill="var(--mint)" />}
      </svg>
      {selected && <div role="tooltip" className="pointer-events-none absolute right-0 bottom-full z-20 mb-1 min-w-max rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md">
        <strong className="block tabular-nums">{format(selected.value)}</strong>
        <time dateTime={new Date(selected.timestamp).toISOString()} className="text-muted-foreground">
          {new Date(selected.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
        </time>
      </div>}
    </div>
  );
}