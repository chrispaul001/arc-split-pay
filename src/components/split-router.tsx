import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Link2, Plus, Trash2, Wallet } from "lucide-react";

type Party = { id: number; name: string; address: string; bps: number };

const PALETTE = ["var(--electric)", "var(--mint)", "oklch(0.68 0.17 300)", "oklch(0.75 0.15 85)"];

let nextId = 4;

export function SplitRouter() {
  const [total, setTotal] = useState("1250");
  const [parties, setParties] = useState<Party[]>([
    { id: 1, name: "Merchant treasury", address: "0x8fA2…4c19", bps: 7000 },
    { id: 2, name: "Affiliate partner", address: "0x21Bd…9e07", bps: 2000 },
    { id: 3, name: "Platform fee", address: "0xC730…11aa", bps: 1000 },
  ]);

  const totalBps = parties.reduce((s, p) => s + p.bps, 0);
  const amount = Number(total) || 0;
  const balanced = totalBps === 10000;

  const link = useMemo(
    () =>
      `https://pay.coindecc.xyz/s/${parties
        .map((p) => p.bps)
        .join("-")}?amt=${amount}&net=arc`,
    [parties, amount],
  );

  const update = (id: number, patch: Partial<Party>) =>
    setParties((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const rebalance = () =>
    setParties((ps) => {
      const even = Math.floor(10000 / ps.length);
      return ps.map((p, i) => ({ ...p, bps: i === 0 ? 10000 - even * (ps.length - 1) : even }));
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="glass animate-rise space-y-5 rounded-3xl p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">Split-Router link builder</h3>
            <p className="text-xs text-muted-foreground">
              Route incoming USDC across parties atomically at settlement.
            </p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={rebalance}>
            Even split
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Total amount (USDC)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))}
              className="bg-background/40 font-display text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Reference</Label>
            <Input id="ref" defaultValue="order-8842" className="bg-background/40" />
          </div>
        </div>

        <div className="space-y-3">
          {parties.map((p, i) => {
            const pct = p.bps / 100;
            return (
              <div key={p.id} className="rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary/70">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <input
                      value={p.name}
                      onChange={(e) => update(p.id, { name: e.target.value })}
                      className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-sm font-bold tabular-nums">{pct.toFixed(2)}%</span>
                    {parties.length > 2 && (
                      <button
                        onClick={() => setParties((ps) => ps.filter((x) => x.id !== p.id))}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0" />
                  <input
                    value={p.address}
                    onChange={(e) => update(p.id, { address: e.target.value })}
                    className="w-full min-w-0 bg-transparent font-mono outline-none"
                    placeholder="0x…"
                  />
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <Slider
                    value={[p.bps]}
                    min={0}
                    max={10000}
                    step={25}
                    onValueChange={([v]) => update(p.id, { bps: v })}
                  />
                  <span className="shrink-0 rounded-full bg-background/50 px-2 py-1 font-mono text-[11px] tabular-nums">
                    {p.bps} bps
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Receives{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {((amount * p.bps) / 10000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            setParties((ps) => [
              ...ps,
              { id: nextId++, name: "New recipient", address: "0x0000…0000", bps: 0 },
            ])
          }
        >
          <Plus className="size-4" /> Add recipient
        </Button>
      </div>

      <div className="glass animate-rise space-y-5 rounded-3xl p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Allocation</h3>

        <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary/70">
          {parties.map((p, i) => (
            <div
              key={p.id}
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (p.bps / 10000) * 100)}%`,
                background: PALETTE[i % PALETTE.length],
              }}
            />
          ))}
        </div>

        <div
          className={`rounded-2xl px-3 py-2 text-xs font-medium ${
            balanced ? "bg-mint/15 text-mint" : "bg-destructive/15 text-destructive"
          }`}
        >
          {balanced
            ? "Balanced · 10,000 bps allocated"
            : `${totalBps.toLocaleString()} / 10,000 bps — adjust to publish`}
        </div>

        <ul className="space-y-2">
          {parties.map((p, i) => (
            <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums">
                {((amount * p.bps) / 10000).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link2 className="size-3.5" /> Generated payment link
          </p>
          <p className="break-all font-mono text-[11px]">{link}</p>
        </div>

        <Button
          className="w-full"
          disabled={!balanced}
          onClick={() => {
            navigator.clipboard?.writeText(link);
            toast.success("Payment link copied", { description: "Ready to share with your customer." });
          }}
        >
          <Copy className="size-4" /> Copy payment link
        </Button>
      </div>
    </div>
  );
}
