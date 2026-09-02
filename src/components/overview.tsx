import { Sparkline } from "./sparkline";
import { Reveal } from "./reveal";
import { ArrowUpRight, Coins, Waves, Split, Zap, ShieldCheck } from "lucide-react";

const metrics = [
  {
    label: "Total Volume (USDC)",
    value: "$2,481,930",
    delta: "+18.4%",
    icon: Coins,
    data: [12, 18, 15, 24, 22, 31, 29, 38, 44, 41, 52, 61],
  },
  {
    label: "Active Payment Streams",
    value: "1,284",
    delta: "+6.2%",
    icon: Waves,
    data: [30, 28, 33, 31, 36, 34, 40, 44, 42, 48, 47, 53],
  },
  {
    label: "Instant Split Executions",
    value: "94,207",
    delta: "+41.9%",
    icon: Split,
    data: [8, 14, 11, 19, 26, 22, 34, 40, 37, 49, 58, 72],
  },
];

const activity = [
  { id: "0x7ac1…9e2f", label: "Checkout · Nova Studio", amount: "+ 1,240.00", parties: 3, t: "12s ago" },
  { id: "0x4b90…c71a", label: "Split payout · Affiliate", amount: "+ 318.50", parties: 2, t: "48s ago" },
  { id: "0xd33e…0b84", label: "Stream settle · Retainer", amount: "+ 5,000.00", parties: 4, t: "2m ago" },
  { id: "0x91fa…7d10", label: "Checkout · Loop Hardware", amount: "+ 89.99", parties: 2, t: "4m ago" },
];

export function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="glass animate-rise group/metric w-full max-w-full rounded-3xl px-4 py-5 sm:px-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {m.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">{m.value}</p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform duration-300 group-hover/metric:scale-110">
                <m.icon className="size-5 animate-float" />
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint">
                <ArrowUpRight className="size-3.5" />
                {m.delta}
              </span>
              <Sparkline data={m.data} className="h-10 w-32" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h3 className="truncate text-lg font-semibold">Settlement flow · last 24h</h3>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] break-words text-muted-foreground">
              Arc · sub-second
            </span>
          </div>
          <Sparkline
            data={[14, 22, 18, 30, 26, 42, 38, 55, 48, 66, 60, 79, 72, 91, 84, 104]}
            className="mt-5 h-44 w-full"
            filled
          />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { k: "Avg settle", v: "0.42s" },
              { k: "Gas token", v: "USDC" },
              { k: "Success rate", v: "99.98%" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-secondary/60 py-3">
                <p className="text-[11px] break-words text-muted-foreground">{s.k}</p>
                <p className="mt-0.5 font-display font-semibold">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        </Reveal>

        <Reveal delay={90}>
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <h3 className="text-lg font-semibold">Live activity</h3>
          <ul className="mt-4 space-y-2.5">
            {activity.map((a, i) => (
              <li
                key={a.id}
                style={{ animationDelay: `${120 + i * 60}ms` }}
                className="group animate-rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:bg-secondary/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.label}</p>
                  <p className="truncate font-mono text-[11px] break-words text-muted-foreground">
                    {a.id} · {a.parties} parties · {a.t}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-mint">{a.amount}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2.5 text-xs break-words text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            All splits executed atomically on Arc.
            <Zap className="ml-auto size-4 shrink-0 text-mint" />
          </div>
        </div>
        </Reveal>
      </div>
    </div>
  );
}
