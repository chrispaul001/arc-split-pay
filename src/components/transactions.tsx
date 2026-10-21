import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { useTxHistory } from "@/lib/use-tx-history";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TxKind } from "@/lib/tx-history";
import { explorerTx, isRouterContract, shortAddress } from "@/lib/web3";
import { DownloadReceiptButton } from "@/components/ReceiptModal";

const KIND_LABEL: Record<TxKind, string> = { payment: "Checkout payment", split: "Split payout", stream: "Stream payout" };
const FILTERS: ("all" | TxKind)[] = ["all", "payment", "split", "stream"];

export function Transactions({ focusHash }: { focusHash?: string } = {}) {
  const connected = useWalletGate();
  const { address } = useAccount();
  const { txs, chain, loading, backfilling } = useTxHistory(address);
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

  const [flash, setFlash] = useState<string | undefined>();
  const focusFound = !!focusHash && txs.some((t) => t.hash.toLowerCase() === focusHash);
  useEffect(() => {
    if (!focusHash || !focusFound) return;
    setFilter("all");
    setQ("");
    setFlash(focusHash);
    const id = requestAnimationFrame(() =>
      document.getElementById(`tx-${focusHash}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    const t = setTimeout(() => setFlash(undefined), 4000);
    return () => { cancelAnimationFrame(id); clearTimeout(t); };
  }, [focusHash, focusFound]);

  if (!connected) return <GuestEmpty description="Connect your wallet to view your history." />;

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

      {backfilling && txs.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Syncing wallet history…
        </p>
      )}
      {(loading || backfilling) && txs.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/40 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading history…
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          {txs.length > 0 ? "No transactions match your search." : chain.isError ? "Your history is temporarily unavailable. Please try again shortly." : "No transactions yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => (
            <li
              key={t.hash}
              id={`tx-${t.hash.toLowerCase()}`}
              className={`rounded-2xl bg-secondary/50 p-4 transition-shadow duration-700 ${flash === t.hash.toLowerCase() ? "ring-2 ring-primary shadow-[0_0_24px_-4px_var(--primary)]" : "ring-0"}`}
            >
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
                {t.from && t.from.toLowerCase() !== address?.toLowerCase() && !isRouterContract(t.from) && <p className="break-all">From {t.from}</p>}
                {(() => {
                  // Real receiving wallet: the stored recipient, or the only split leg — never the routing contract.
                  const legs = t.transfers ?? [];
                  const dest = t.to && !isRouterContract(t.to) ? t.to : legs.length === 1 ? legs[0]!.address : t.splits?.length === 1 ? t.splits[0]!.address : undefined;
                  if (!dest) return null;
                  return <p className="break-all">To {dest.toLowerCase() === address?.toLowerCase() ? `${dest} (your wallet)` : dest}</p>;
                })()}
                {t.splits && t.splits.length > 1 && (
                  <p className="break-words">
                    Split: {t.splits.map((s) => `${s.name || shortAddress(s.address)} ${(s.bps / 100).toFixed(2)}%`).join(" · ")}
                  </p>
                )}
                {t.transfers && t.transfers.length > 1 && (
                  <div className="space-y-1 pt-1">
                    <p>Recipients</p>
                    {t.transfers.map((leg, i) => {
                      const party = t.splits?.find((s) => s.address.toLowerCase() === leg.address.toLowerCase());
                      const mine = leg.address.toLowerCase() === address?.toLowerCase();
                      return <p key={`${leg.address}-${i}`} className="break-all">{party?.name ? `${party.name} · ` : ""}{shortAddress(leg.address)}{mine ? " (you)" : ""} · {leg.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC</p>;
                    })}
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
              <div className="mt-3 flex justify-end">
                <DownloadReceiptButton
                  data={{
                    hash: t.hash, amount: t.amount, token: "USDC", timestamp: t.timestamp, label: t.label,
                    payer: t.from && !isRouterContract(t.from) ? t.from : undefined,
                    allocations: t.transfers?.length
                      ? t.transfers.map((l) => {
                          const p = t.splits?.find((s) => s.address.toLowerCase() === l.address.toLowerCase());
                          return { address: l.address, name: p?.name, bps: p?.bps, amount: l.amount };
                        })
                      : t.splits?.map((s) => ({ address: s.address, name: s.name, bps: s.bps, amount: (t.amount * s.bps) / 10_000 })),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {chain.isError && txs.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          Showing your saved transactions while we reconnect to Arc.
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void chain.refetch()}>Retry</Button>
        </p>
      )}
    </div>
  );
}
