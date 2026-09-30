import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { readTxs, subscribeTxs, type TxKind, type TxRecord } from "@/lib/tx-history";
import { explorerTx, shortAddress } from "@/lib/web3";

const KIND_LABEL: Record<TxKind, string> = { payment: "Checkout payment", split: "Split payout", stream: "Stream payout" };
const FILTERS: ("all" | TxKind)[] = ["all", "payment", "split", "stream"];

export function Transactions() {
  const connected = useWalletGate();
  const { address } = useAccount();
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [filter, setFilter] = useState<"all" | TxKind>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!address) return setTxs([]);
    const load = () => setTxs(readTxs(address));
    load();
    return subscribeTxs(load);
  }, [address]);

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
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : KIND_LABEL[f]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          No confirmed transactions yet. Payments, split sends and stream payouts from this wallet appear here once they settle on Arc.
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
                {t.to && <p className="break-all">To {t.to}</p>}
                {t.splits && t.splits.length > 0 && (
                  <p className="break-words">
                    Split: {t.splits.map((s) => `${s.name || shortAddress(s.address)} ${(s.bps / 100).toFixed(2)}%`).join(" · ")}
                  </p>
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
    </div>
  );
}
