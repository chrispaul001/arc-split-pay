import { Sparkline } from "./sparkline";
import { Reveal } from "./reveal";
import { ArrowUpRight, Coins, Waves, Split, Zap, ShieldCheck, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import { useUsdc } from "@/lib/use-usdc";
import { shortAddress } from "@/lib/web3";

const metrics = [
  {
    label: "Wallet Balance (USDC)",
    value: "$2,481,930",
    zero: "$0.00",
    delta: "Live on Arc",
    icon: Coins,
    data: [12, 18, 15, 24, 22, 31, 29, 38, 44, 41, 52, 61],
  },
  {
    label: "Active Payment Streams",
    value: "0",
    zero: "0",
    delta: "—",
    icon: Waves,
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    label: "Instant Split Executions",
    value: "94,207",
    zero: "0",
    delta: "+41.9%",
    icon: Split,
    data: [8, 14, 11, 19, 26, 22, 34, 40, 37, 49, 58, 72],
  },
];

const EMPTY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export function Overview() {
  const { isConnected, address, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { formatted } = useUsdc();

  const liveBalance =
    formatted == null
      ? "—"
      : `$${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

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
                <p className="mt-2 font-display text-3xl font-bold tabular-nums">
                  {isConnected ? (i === 0 ? liveBalance : m.value) : m.zero}
                </p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform duration-300 group-hover/metric:scale-110">
                <m.icon className="size-5 animate-float" />
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint">
                  <ArrowUpRight className="size-3.5" />
                  {m.delta}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  No data yet
                </span>
              )}
              <Sparkline data={isConnected ? m.data : EMPTY} className="h-10 w-32" />
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
            data={
              isConnected
                ? [14, 22, 18, 30, 26, 42, 38, 55, 48, 66, 60, 79, 72, 91, 84, 104]
                : new Array(16).fill(0)
            }
            className="mt-5 h-44 w-full"
            filled
          />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { k: "Avg settle", v: isConnected ? "0.42s" : "—" },
              { k: "Gas token", v: "USDC" },
              { k: "Success rate", v: isConnected ? "99.98%" : "—" },
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
          {!isConnected && (
            <div className="mt-4 grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Wallet className="size-5" />
              </span>
              <p className="text-sm font-medium">No wallet connected</p>
              <p className="text-xs break-words text-muted-foreground">
                Connect your wallet to load live volume, streams and split activity.
              </p>
              <Button size="sm" onClick={() => openConnectModal?.()}>
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
              <p className="rounded-2xl border border-dashed border-border px-3 py-2.5 text-xs break-words text-muted-foreground">
                Your checkouts, splits and streams will appear here as they settle on-chain.
              </p>
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
