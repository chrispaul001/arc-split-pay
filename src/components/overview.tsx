import { Sparkline } from "./sparkline";
import { Reveal } from "./reveal";
import { ArrowUpRight, Coins, Waves, Split, Zap, ShieldCheck, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectWallet } from "@/lib/use-connect";
import { Button } from "./ui/button";
import { useUsdc } from "@/lib/use-usdc";
import { explorerTx, shortAddress } from "@/lib/web3";
import { useTelemetry } from "@/lib/use-telemetry";
import { timeAgo } from "@/lib/merchant-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { MetricTrend, type TrendPoint } from "./metric-trend";

export function Overview() {
  const { isConnected, address, chain } = useAccount();
  const { connect: connectWallet } = useConnectWallet();
  const { formatted } = useUsdc();
  const { data } = useMerchantStore();

  const liveBalance =
    formatted == null
      ? "—"
      : `$${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const tele = useTelemetry();
  const t = tele.data;
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const splitExecutions = t ? t.events.length : data.notifications.filter((n) => n.kind === "split").length;
  const activeStreams = data.streams.filter((s) => s.running).length;
  const now = Date.now();
  const start = now - 24 * 3600 * 1000;
  const times = Array.from({ length: 16 }, (_, i) => start + (i + 1) * 24 * 3600 * 1000 / 16);
  const events = isConnected ? (t?.events ?? []) : [];
  const volumePoints: TrendPoint[] = times.map((timestamp) => ({ timestamp,
    value: events.filter((e) => e.timestamp >= start && e.timestamp <= timestamp).reduce((sum, e) => sum + e.amount, 0) }));
  const balance = isConnected ? Number(formatted) || 0 : 0;
  // Reconstruct only confirmed outgoing pay() activity; do not fabricate a balance history.
  const mine = events.filter((e) => e.from.toLowerCase() === address?.toLowerCase());
  const balancePoints: TrendPoint[] = times.map((timestamp) => ({ timestamp,
    value: Math.max(0, balance + mine.filter((e) => e.timestamp > timestamp && e.timestamp <= now).reduce((sum, e) => sum + e.amount, 0)) }));
  const streamPoints: TrendPoint[] = times.map((timestamp) => ({ timestamp,
    value: isConnected ? data.streams.filter((s) => s.running && s.createdAt <= timestamp).length : 0 }));
  const splitPoints: TrendPoint[] = times.map((timestamp) => ({ timestamp,
    value: events.filter((e) => e.timestamp >= start && e.timestamp <= timestamp).length }));

  const metrics = [
    {
      label: "Contract Volume (USDC)",
      value: t ? fmt(t.volume) : tele.isLoading ? "…" : "—",
      zero: "$0.00",
      delta: t ? `${t.payers} payers on-chain` : "Syncing Arc logs",
      icon: Zap,
      hasValue: Boolean(t && t.volume > 0),
      trend: volumePoints, format: fmt,
    },
    { label: "Wallet Balance (USDC)", value: liveBalance, zero: "$0.00", delta: "Live on Arc", icon: Coins, hasValue: Number(formatted) > 0, trend: balancePoints, format: fmt },
    {
      label: "Active Payment Streams",
      value: String(activeStreams),
      zero: "0",
      delta: activeStreams ? "Streaming now" : "No streams",
      icon: Waves,
      hasValue: activeStreams > 0,
      trend: streamPoints, format: (n: number) => String(n),
    },
    {
      label: "Instant Split Executions",
      value: String(splitExecutions),
      zero: "0",
      delta: splitExecutions ? "Settled on Arc" : "None yet",
      icon: Split,
      hasValue: splitExecutions > 0,
      trend: splitPoints, format: (n: number) => String(n),
    },
  ];

  return (
    <div className="w-full max-w-[100vw] space-y-6 overflow-x-hidden">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
             className="glass animate-rise group/metric w-full min-w-0 max-w-[100vw] overflow-x-hidden rounded-3xl px-4 py-5 sm:px-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {m.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold tabular-nums">
                  {isConnected ? m.value : m.zero}
                </p>

              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform duration-300 group-hover/metric:scale-110">
                <m.icon className="size-5 animate-float" />
              </div>
            </div>
            <div className="mt-4 flex min-w-0 items-end justify-between gap-3">
              {isConnected && m.hasValue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint">
                  <ArrowUpRight className="size-3.5" />
                  {m.delta}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              <MetricTrend points={m.trend} format={m.format} label={m.label} />
            </div>
          </div>
        ))}
      </div>

       <div className="grid min-w-0 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
         <div className="glass animate-rise w-full min-w-0 max-w-[100vw] overflow-x-hidden rounded-3xl px-4 py-5 sm:px-5">
           <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
             <h3 className="min-w-0 text-base leading-snug font-semibold wrap-break-word sm:text-lg">Settlement flow · last 24h</h3>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] break-words text-muted-foreground">
              Arc · sub-second
            </span>
          </div>
          <Sparkline
            data={isConnected && t ? t.buckets : new Array(16).fill(0)}
            className="mt-5 h-44 w-full"
            filled
          />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { k: "Avg settle", v: t ? `${t.blockTime.toFixed(2)}s` : "…" },
              { k: "Payments", v: t ? String(t.events.length) : "…" },
              { k: "Avg ticket", v: t && t.events.length ? fmt(t.volume / t.events.length) : "—" },
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
         <div className="glass animate-rise w-full min-w-0 max-w-[100vw] overflow-x-hidden rounded-3xl px-4 py-5 sm:px-5">
          <h3 className="text-lg font-semibold">Live activity</h3>
          {!isConnected && (
            <div className="mt-4 grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Wallet className="size-5" />
              </span>
              <p className="text-sm font-medium">No wallet connected</p>
              <p className="text-xs break-words text-muted-foreground">
                Connect your wallet to load live volume, streams and split activity.
              </p>
              <Button size="sm" onClick={connectWallet}>
                <Wallet className="size-4" /> Connect Wallet
              </Button>
            </div>
          )}
          {isConnected && (
            <div className="animate-rise mt-4 space-y-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Connected wallet</p>
                  <p className="truncate font-mono text-[11px] break-words text-muted-foreground">
                    {address ? shortAddress(address) : "—"} · {chain?.name ?? "Arc Testnet"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-mint">
                  <span className="pulse-dot size-1.5 rounded-full bg-mint" /> Live
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">USDC balance</p>
                  <p className="truncate text-[11px] break-words text-muted-foreground">
                    Refreshes every 15s from Arc Testnet
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-mint tabular-nums">
                  {formatted == null
                    ? "—"
                    : `${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
                </span>
              </div>
              {t && t.events.length > 0 ? (
                t.events.slice(0, 6).map((e) => (
                  <a
                    key={e.hash + e.from}
                    href={explorerTx(e.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 px-3 py-2.5 transition-colors hover:bg-secondary/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">pay() from {shortAddress(e.from)}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {shortAddress(e.hash)} · {timeAgo(e.timestamp)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-mint tabular-nums">
                      +{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </a>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-3 py-2.5 text-xs break-words text-muted-foreground">
                  {tele.isLoading ? "Reading contract events from Arc…" : "No pay() events found on the CoindeccPay contract yet."}
                </p>
              )}
            </div>
          )}
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
