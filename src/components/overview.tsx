import { Sparkline } from "./sparkline";
import { Reveal } from "./reveal";
import { useEffect, useState } from "react";
import { ArrowUpRight, Coins, Waves, Split, Zap, ShieldCheck, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectWallet } from "@/lib/use-connect";
import { Button } from "./ui/button";
import { useUsdc } from "@/lib/use-usdc";
import { COINDECC_PAY_ADDRESS, explorerTx, isRouterContract, shortAddress } from "@/lib/web3";
import { timeAgo } from "@/lib/merchant-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { MetricBars, MetricTrend, MetricWave, type TrendPoint } from "./metric-trend";
import { useTxHistory } from "@/lib/use-tx-history";

const DAY = 24 * 3600 * 1000;
const BUCKETS = 48;
const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: n > 0 && n < 0.01 ? 6 : 2 })}`;

export function Overview() {
  const { isConnected, address, chain } = useAccount();
  const { connect: connectWallet } = useConnectWallet();
  const { formatted } = useUsdc();
  const { data } = useMerchantStore();

  const liveBalance = formatted == null ? "—" : fmt(Number(formatted) || 0);

  const history = useTxHistory(isConnected ? address : undefined);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  // All-time count from the saved wallet history, so it never resets on a new day.
  const splitExecutions = isConnected ? history.txs.filter((x) => x.kind === "split" || (x.transfers?.length ?? 0) > 0).length : 0;
  const activeStreams = data.streams.filter((s) => s.running).length;
  const start = now - DAY;
  const me = address?.toLowerCase();
  const pay = COINDECC_PAY_ADDRESS.toLowerCase();
  // Every confirmed USDC settlement processed through this merchant wallet:
  // checkout payments (sent or received), split payouts and split proceeds.
  // Faucet drops and unrelated plain transfers are excluded.
  const allSettlements = isConnected && me ? history.txs.filter((tx) => {
    if (!Number.isFinite(tx.amount) || tx.amount <= 0) return false;
    const from = tx.from.toLowerCase();
    const to = tx.to?.toLowerCase();
    if (tx.kind === "payment") return from === me || to === me || tx.transfers?.some((t) => t.address.toLowerCase() === me);
    if (tx.kind === "split") return (from === me && (Boolean(tx.splits?.length) || Boolean(tx.label?.startsWith("Split ·")) || Boolean(tx.transfers?.length))) || (from === pay && to === me);
    return false;
  }) : [];
  const totalVolume = allSettlements.reduce((sum, tx) => sum + tx.amount, 0);
  const settlements = allSettlements.filter((tx) => tx.timestamp >= start && tx.timestamp <= now);
  const settlementVolume = settlements.reduce((sum, tx) => sum + tx.amount, 0);
  const bucketMs = DAY / BUCKETS;
  const settlementPoints: TrendPoint[] = Array.from({ length: BUCKETS + 1 }, (_, i) => ({
    timestamp: start + i * bucketMs,
    value: i === 0 ? 0 : settlements.filter((tx) => tx.timestamp > start + (i - 1) * bucketMs && tx.timestamp <= start + i * bucketMs)
      .reduce((sum, tx) => sum + tx.amount, 0),
  }));
  // Rolling 2-hour windows: shows *when* activity happened instead of a cumulative cliff.
  const SLOTS = 12;
  const slotMs = DAY / SLOTS;
  const slotEnd = (i: number) => start + (i + 1) * slotMs;
  const inSlot = (t: number, i: number) => t > slotEnd(i) - slotMs && t <= slotEnd(i);
  const volumePoints: TrendPoint[] = Array.from({ length: SLOTS }, (_, i) => ({ timestamp: slotEnd(i),
    value: settlements.filter((e) => inSlot(e.timestamp, i)).reduce((sum, e) => sum + e.amount, 0) }));
  const splitPoints: TrendPoint[] = Array.from({ length: SLOTS }, (_, i) => ({ timestamp: slotEnd(i),
    value: settlements.filter((e) => e.kind === "split" && inSlot(e.timestamp, i)).length }));
  const slotRange = (p: TrendPoint) => {
    const f = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${f(p.timestamp - slotMs)} – ${f(p.timestamp)}`;
  };
  const balance = isConnected ? Number(formatted) || 0 : 0;
  // Walk back from the live balance using confirmed in/out wallet history (no fabricated values).
  const flows = isConnected && me ? history.txs.filter((tx) => tx.timestamp > start && tx.timestamp <= now && Number.isFinite(tx.amount)) : [];
  const delta = (tx: (typeof flows)[number]) => {
    if (tx.from.toLowerCase() === me) return -tx.amount;
    const got = tx.transfers?.find((t) => t.address.toLowerCase() === me);
    if (got) return got.amount;
    return tx.to?.toLowerCase() === me ? tx.amount : 0;
  };
  const balancePoints: TrendPoint[] = [...Array.from({ length: 24 }, (_, i) => {
    const timestamp = start + (i + 1) * (DAY / 24);
    return { timestamp, value: Math.max(0, balance - flows.filter((e) => e.timestamp > timestamp).reduce((s, e) => s + delta(e), 0)) };
  }).slice(0, -1), { timestamp: now, value: balance }];
  const isLive = isConnected && history.liveUpdatedAt > 0 && now - history.liveUpdatedAt < 60_000;

  const metrics = [
    {
      label: "Settlement Volume (USDC)",
      value: history.loading && !history.txs.length ? "…" : fmt(totalVolume),
      zero: "$0.00",
      delta: `${allSettlements.length} settled · ${fmt(settlementVolume)} in 24h`,
      icon: Zap,
      hasValue: totalVolume > 0,
      trend: volumePoints, format: fmt, bars: false,
    },
    { label: "Wallet Balance (USDC)", value: liveBalance, zero: "$0.00", delta: "Live on Arc", icon: Coins, hasValue: Number(formatted) > 0, trend: balancePoints, format: fmt },
    {
      label: "Active Payment Streams",
      value: String(activeStreams),
      zero: "0",
      delta: activeStreams ? "Streaming now" : "No streams",
      icon: Waves,
      hasValue: activeStreams > 0,
      trend: [] as TrendPoint[], format: (n: number) => String(n),
    },
    {
      label: "Instant Split Executions",
      value: String(splitExecutions),
      zero: "0",
      delta: splitExecutions ? "Settled on Arc" : "None yet",
      icon: Split,
      hasValue: splitExecutions > 0,
      trend: splitPoints, format: (n: number) => `${n} split${n === 1 ? "" : "s"}`, bars: true,
    },
  ];

  return (
    <div className="min-w-0 w-full space-y-6 overflow-x-clip">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
             className="glass overview-surface animate-rise group/metric w-full min-w-0 rounded-3xl px-4 py-5 sm:px-5"
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
              {m.label === "Active Payment Streams" ?
                <MetricWave value={isConnected ? activeStreams : 0} total={isConnected ? data.streams.length : 0} label={m.label} /> :
                m.label === "Instant Split Executions" ?
                <MetricBars points={m.trend} format={m.format} label={m.label} range={slotRange} /> :
                <MetricTrend points={m.trend} format={m.format} label={m.label} live={isLive}
                  range={m.label.startsWith("Settlement") ? slotRange : undefined} />}
            </div>
          </div>
        ))}
      </div>

       <div className="grid min-w-0 gap-4 lg:grid-cols-[1.6fr_1fr]">
         <Reveal className="min-w-0">
          <div className="glass overview-surface animate-rise w-full min-w-0 rounded-3xl px-4 py-5 sm:px-5">
           <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
             <h3 className="min-w-0 text-base leading-snug font-semibold wrap-break-word sm:text-lg">Settlement flow · last 24h</h3>
             <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
               {isLive && <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" aria-hidden="true" />}
               {isConnected ? isLive ? "Live on Arc" : "Syncing Arc" : "Arc Testnet"}
            </span>
          </div>
          <Sparkline
              points={isConnected && (!history.loading || history.txs.length > 0) ? settlementPoints : []}
            className="mt-5 h-44 w-full"
            filled
          />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
               { k: "24h volume", v: !isConnected ? "$0.00" : history.loading && !history.txs.length ? "…" : fmt(settlementVolume) },
               { k: "Payments", v: !isConnected ? "0" : history.loading && !history.txs.length ? "…" : String(settlements.length) },
               { k: "Avg ticket", v: !isConnected ? "—" : history.loading && !history.txs.length ? "…" : settlements.length ? fmt(settlementVolume / settlements.length) : "—" },

            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-secondary/60 py-3">
                <p className="text-[11px] break-words text-muted-foreground">{s.k}</p>
                <p className="mt-0.5 font-display font-semibold">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        </Reveal>

         <Reveal delay={90} className="min-w-0">
          <div className="glass overview-surface animate-rise w-full min-w-0 rounded-3xl px-4 py-5 sm:px-5">
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
                    Refreshes every 15s from Arc
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-mint tabular-nums">
                  {formatted == null
                    ? "—"
                    : `${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
                </span>
              </div>
              {history.txs.length > 0 ? (
                history.txs.slice(0, 6).map((e) => {
                  const me = address?.toLowerCase();
                  const incoming = e.to?.toLowerCase() === me || (e.from.toLowerCase() !== me);
                  const legs = e.transfers ?? [];
                  const realTo = e.to && !isRouterContract(e.to) ? e.to : legs.length === 1 ? legs[0]!.address : undefined;
                  const party = incoming ? (isRouterContract(e.from) ? undefined : e.from) : realTo;
                  return (
                    <a
                      key={e.hash}
                      href={explorerTx(e.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 px-3 py-2.5 transition-colors hover:bg-secondary/80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.label || (incoming ? "USDC received" : "Payment sent")}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {party ? `${incoming ? "From" : "To"} ${shortAddress(party)} · ` : ""}{timeAgo(e.timestamp)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${incoming ? "text-mint" : ""}`}>
                        {incoming ? "+" : "−"}{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </a>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-3 py-2.5 text-xs break-words text-muted-foreground">
                  {history.loading || history.backfilling ? "Fetching wallet history…" : "No transactions yet."}
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
