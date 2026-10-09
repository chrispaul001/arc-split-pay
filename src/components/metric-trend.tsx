import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export type TrendPoint = { timestamp: number; value: number };

const W = 100;
const H = 40;
const TOP = 6;
const BOTTOM = 36;

/** Monotone cubic (Fritsch–Carlson) path: smooth, never overshoots below zero. */
function smoothPath(pts: (readonly [number, number])[]) {
  const n = pts.length;
  if (n < 2) return "";
  const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
  const g = (arr: number[], i: number) => arr[i] ?? 0;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(g(X, i + 1) - g(X, i) || 1);
    m.push((g(Y, i + 1) - g(Y, i)) / g(dx, i));
  }
  const t: number[] = [g(m, 0)];
  for (let i = 1; i < n - 1; i++) t.push(g(m, i - 1) * g(m, i) <= 0 ? 0 : (g(m, i - 1) + g(m, i)) / 2);
  t.push(g(m, n - 2));
  for (let i = 0; i < n - 1; i++) {
    const mi = g(m, i);
    if (mi === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = g(t, i) / mi, b = g(t, i + 1) / mi, s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * mi; t[i + 1] = k * b * mi; }
  }
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(g(X, 0))},${f(g(Y, 0))}`;
  for (let i = 0; i < n - 1; i++) {
    const h = g(dx, i) / 3;
    d += ` C${f(g(X, i) + h)},${f(g(Y, i) + g(t, i) * h)} ${f(g(X, i + 1) - h)},${f(g(Y, i + 1) - g(t, i + 1) * h)} ${f(g(X, i + 1))},${f(g(Y, i + 1))}`;
  }
  return d;
}

function Shell({ label, summary, count, active, setActive, children, tooltip }: {
  label: string; summary: string; count: number; active: number | null;
  setActive: (fn: (i: number | null) => number | null) => void; children: ReactNode; tooltip: ReactNode;
}) {
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (count - 1));
    setActive(() => Math.max(0, Math.min(count - 1, i)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((i) => Math.max(0, Math.min(count - 1, (i ?? count - 1) + (e.key === "ArrowLeft" ? -1 : 1))));
  };
  return (
    <div
      className="relative h-14 w-36 max-w-[48%] shrink-0 cursor-crosshair touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="img" aria-label={`${label}: ${summary}`} tabIndex={0}
      onPointerMove={onPointer} onPointerDown={onPointer}
      onPointerLeave={() => setActive(() => null)} onPointerCancel={() => setActive(() => null)}
      onBlur={() => setActive(() => null)} onFocus={() => setActive(() => count - 1)} onKeyDown={onKey}
    >
      {children}
      {active !== null && tooltip}
    </div>
  );
}

function Tip({ value, sub }: { value: string; sub: string }) {
  return (
    <div role="tooltip" className="animate-in fade-in-0 zoom-in-95 pointer-events-none absolute right-0 bottom-full z-20 mb-2 min-w-max rounded-xl border border-border bg-popover/95 px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg backdrop-blur duration-150">
      <strong className="block text-xs tabular-nums">{value}</strong>
      <span className="text-muted-foreground">{sub}</span>
    </div>
  );
}

const when = (t: number) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Smooth area spline with a live pulsing tip. */
export function MetricTrend({ points, format, label, live = false, range }: {
  points: TrendPoint[]; format: (v: number) => string; label: string; live?: boolean; range?: ((p: TrendPoint, i: number) => string) | undefined;
}) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const now = Date.now();
  const values = points.length > 1 ? points : [{ timestamp: now - 3600000, value: 0 }, { timestamp: now, value: 0 }];
  const max = Math.max(...values.map((p) => p.value));
  const min = Math.min(...values.map((p) => p.value));
  const flat = max - min < 1e-9;
  const span = flat ? 1 : max - min;
  const pad = flat ? 0 : span * 0.08;
  const xy = values.map((p, i) => [(i / (values.length - 1)) * W,
    flat ? (max > 0 ? TOP + 10 : BOTTOM - 2) : BOTTOM - ((p.value - min + pad) / (span + pad * 2)) * (BOTTOM - TOP)] as const);
  const line = smoothPath(xy);
  const tip = xy[xy.length - 1] ?? ([W, BOTTOM] as const);
  const sel = active === null ? null : values[active];
  const pt = active === null ? null : xy[active];
  return (
    <Shell label={label} summary={`latest ${format((values[values.length - 1]?.value ?? 0))}`} count={values.length}
      active={active} setActive={setActive}
      tooltip={sel && <Tip value={format(sel.value)} sub={range ? range(sel, active!) : when(sel.timestamp)} />}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--electric)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--electric)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line x1="0" x2={W} y1={BOTTOM} y2={BOTTOM} stroke="var(--border)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#f${id})`} className="transition-[d] duration-700 ease-out" />
        <path d={line} fill="none" stroke={`url(#s${id})`} strokeWidth="2.25" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="transition-[d] duration-700 ease-out" />
        {pt && <line x1={pt[0]} x2={pt[0]} y1={TOP - 4} y2={BOTTOM} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* Dots in HTML so they stay round despite the stretched SVG. */}
      {pt && <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-electric shadow" style={{ left: `${pt[0]}%`, top: `${(pt[1] / H) * 100}%` }} />}
      {active === null && <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${tip[0]}%`, top: `${(tip[1] / H) * 100}%` }}>
        {live && <span className="absolute inset-0 m-auto size-2 animate-ping rounded-full bg-mint/70 motion-reduce:hidden" />}
        <span className={`relative block size-2 rounded-full border border-background ${live ? "bg-mint" : "bg-electric"}`} />
      </span>}
    </Shell>
  );
}

/** Rounded frequency histogram, newest bar on the right. */
export function MetricBars({ points, format, label, range }: {
  points: TrendPoint[]; format: (v: number) => string; label: string; range: (p: TrendPoint, i: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((s, p) => s + p.value, 0);
  const sel = active === null ? null : points[active];
  return (
    <Shell label={label} summary={`${format(total)} in range`} count={points.length} active={active} setActive={setActive}
      tooltip={sel && <Tip value={format(sel.value)} sub={range(sel, active!)} />}>
      <div className="flex h-full items-end gap-[3px] pb-1" aria-hidden="true">
        {points.map((p, i) => {
          const h = p.value > 0 ? 18 + (p.value / max) * 82 : 8;
          const on = active === i;
          return <span key={i} className={`flex-1 rounded-full transition-all duration-500 ease-out ${p.value > 0 ? on ? "bg-electric" : "bg-electric/75" : on ? "bg-muted-foreground/40" : "bg-secondary"} ${i === points.length - 1 && p.value > 0 ? "shadow-[0_0_10px_var(--electric)]" : ""}`} style={{ height: `${h}%` }} />;
        })}
      </div>
    </Shell>
  );
}

/** Flowing wave: calm standby when idle, layered ripple when streams run. */
export function MetricWave({ value, total, label }: { value: number; total: number; label: string }) {
  const [active, setActive] = useState(false);
  const on = value > 0;
  const wave = (amp: number, phase: number) => {
    let d = `M0,${20 + amp * Math.sin(phase)}`;
    for (let x = 2; x <= 200; x += 2) d += ` L${x},${(20 + amp * Math.sin((x / 100) * Math.PI * 2 + phase)).toFixed(2)}`;
    return d;
  };
  return (
    <div className="relative h-14 w-36 max-w-[48%] shrink-0 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="img" aria-label={`${label}: ${value} of ${total}`} tabIndex={0}
      onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)} onPointerDown={() => setActive(true)}
      onFocus={() => setActive(true)} onBlur={() => setActive(false)}>
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className={`h-full w-[200%] motion-reduce:animate-none ${on ? "animate-[wave-flow_3s_linear_infinite]" : "animate-[wave-flow_9s_linear_infinite]"}`} aria-hidden="true">
        <g>
          <path d={wave(on ? 7 : 2, 0)} fill="none" stroke="var(--electric)" strokeOpacity={on ? 0.9 : 0.45} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={wave(on ? 4 : 1.2, 1.8)} fill="none" stroke="var(--mint)" strokeOpacity={on ? 0.7 : 0.3} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <span className={`absolute right-1 bottom-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${on ? "bg-mint/15 text-mint" : "bg-secondary text-muted-foreground"}`}>
        {on ? `${value}/${total} live` : "Standby"}
      </span>
      {active && <Tip value={`${value} active / ${total} total`} sub={on ? "Streaming per second" : "Ready to stream"} />}
    </div>
  );
}

/** Back-compat alias. */
export const MetricProgress = MetricWave;
