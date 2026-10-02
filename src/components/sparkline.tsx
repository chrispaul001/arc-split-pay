import { useId, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { TrendPoint } from "./metric-trend";

export function Sparkline({
  points: data,
  className,
  filled = false,
}: {
  points: TrendPoint[];
  className?: string;
  filled?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const w = 100;
  const h = 32;
   const values = data.length > 1 ? data : Array.from({ length: 16 }, () => ({ value: 0, timestamp: 0 }));
  const max = Math.max(...values.map((point) => point.value));
  const min = Math.min(...values.map((point) => point.value));
  const span = max - min || 1;
  const points = values.map((point, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((point.value - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const selected = active === null ? null : values[active];
  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (data.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(data.length - 1, Math.round((event.clientX - rect.left) / rect.width * (data.length - 1)))));
  };

  return (
    <div
      className={cn("relative min-w-0 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      role="img"
       aria-label={data.length > 1 ? `Settlement volume chart, last 24 hours, ${data.length} points. Use arrow keys to inspect.` : "Settlement volume chart, awaiting wallet history."}
      tabIndex={data.length > 1 ? 0 : -1}
      onPointerMove={onPointer}
      onPointerDown={(event) => {
        onPointer(event);
        if (data.length > 1) event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setActive(null); }}
      onBlur={() => setActive(null)}
      onFocus={() => { if (data.length > 1) setActive((i) => i ?? data.length - 1); }}
      onKeyDown={(event) => {
        if (data.length < 2 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
        event.preventDefault();
        setActive((i) => Math.max(0, Math.min(data.length - 1, (i ?? data.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
      }}
    >
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full overflow-hidden" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--electric)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {filled && <path d={area} fill={`url(#${gradientId})`} />}
        <path
          d={line}
          fill="none"
          stroke="var(--electric)"
          strokeWidth={filled ? 1.4 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {!filled && <circle cx={points[points.length - 1]?.[0] ?? 0} cy={points[points.length - 1]?.[1] ?? 0} r={1.8} fill="var(--mint)" />}
      </svg>
       {selected && active !== null && <>
         <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-dashed border-primary/50" style={{ left: `${points[active]?.[0] ?? 0}%` }} />
         <div aria-hidden="true" className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-mint shadow-[0_0_0_3px_var(--mint)]" style={{ left: `${points[active]?.[0] ?? 0}%`, top: `${((points[active]?.[1] ?? 0) / h) * 100}%` }} />
         <div role="tooltip" className="pointer-events-none absolute top-2 z-10 w-max max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md" style={{ left: `${Math.max(20, Math.min(80, points[active]?.[0] ?? 50))}%` }}>
           <strong className="block tabular-nums">{selected.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC</strong>
           <time dateTime={new Date(selected.timestamp).toISOString()} className="text-muted-foreground">
             {new Date(selected.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}
           </time>
         </div>
       </>}
    </div>
  );
}
