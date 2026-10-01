import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { useTxHistory } from "@/lib/use-tx-history";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TxKind } from "@/lib/tx-history";
import { explorerTx, shortAddress } from "@/lib/web3";

const KIND_LABEL: Record<TxKind, string> = { payment: "Checkout payment", split: "Split payout", stream: "Stream payout" };
const FILTERS: ("all" | TxKind)[] = ["all", "payment", "split", "stream"];

export function Transactions() {
  const connected = useWalletGate();
  const { address } = useAccount();
  const { txs, chain, loading } = useTxHistory(address);
  const [filter, setFilter] = useState<"all" | TxKind>("all");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.filter(
      (t) =>
        (filter === "all" || t.kind === filter) &&
        (!s || [t.hash, t.to, t.label].some((v) => v?.toLowerCase().includes(s))),
    );
  }, [txs, filter, q]);

  if (!connected) return <GuestEmpty description="Connect your wallet to see your transaction history." />;

  const total = shown.reduce((a, t) => a + t.amount, 0);

  return (
    <div className="glass animate-rise w-full min-w-0 space-y-4 rounded-3xl px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Transaction history</h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {shown.length} confirmed · {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </p>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hash, address, label" className="bg-background/40 pl-9" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "secondary"}
            onClick={() => setFilter(f)}
            className="rounded-full text-[11px]"
          >
            {f === "all" ? "All" : KIND_LABEL[f]}
          </Button>
        ))}
      </div>

      {loading && txs.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/40 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading on-chain history from Arc…
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          {chain.isError ? "Could not load Arc history. Try again shortly." : "No transactions recorded for this wallet yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => (
            <li key={t.hash} className="rounded-2xl bg-secondary/50 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.label || KIND_LABEL[t.kind]}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {KIND_LABEL[t.kind]} · {new Date(t.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="font-display text-sm font-bold tabular-nums">
                  {t.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC
                </p>
              </div>
              <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {t.from && t.from.toLowerCase() !== address?.toLowerCase() && <p className="break-all">From {t.from}</p>}
                {t.to && t.to.toLowerCase() !== address?.toLowerCase() && <p className="break-all">To {t.to}</p>}
                {t.splits && t.splits.length > 0 && (
                  <p className="break-words">
                    Split: {t.splits.map((s) => `${s.name || shortAddress(s.address)} ${(s.bps / 100).toFixed(2)}%`).join(" · ")}
                  </p>
                )}
                {t.transfers && t.transfers.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p>On-chain split transfers</p>
                    {t.transfers.map((leg, i) => <p key={`${leg.address}-${i}`} className="break-all">{leg.address} · {leg.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC</p>)}
                  </div>
                )}
                <a
                  href={explorerTx(t.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
                >
                  <span className="truncate">{t.hash}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {chain.hasNextPage && <Button variant="secondary" className="w-full" disabled={chain.isFetchingNextPage} onClick={() => void chain.fetchNextPage()}>
        {chain.isFetchingNextPage ? <><Loader2 className="size-4 animate-spin" /> Loading older activity…</> : "Load older activity"}
      </Button>}
      {chain.isError && txs.length > 0 && <p className="text-xs text-destructive">Older activity could not be loaded. Please try again.</p>}
    </div>
  );
}
