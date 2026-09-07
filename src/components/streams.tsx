import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CurrencySelect } from "@/components/currency-select";
import { formatLocal, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";
import { Activity, Pause, Play, Plus, Radio, Square, Timer } from "lucide-react";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { randomId, useMerchantStore } from "@/lib/merchant-store";

export function Streams() {
  const connected = useWalletGate();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const { data, ready, update, notify } = useMerchantStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", address: "", rate: "0.0100" });

  const streams = data.streams;

  // tick running streams and persist accrued amounts
  useEffect(() => {
    if (!connected || !ready) return;
    const t = window.setInterval(() => {
      update((p) =>
        p.streams.some((s) => s.running)
          ? {
              ...p,
              streams: p.streams.map((s) =>
                s.running ? { ...s, streamed: s.streamed + s.ratePerSec / 4 } : s,
              ),
            }
          : p,
      );
    }, 250);
    return () => window.clearInterval(t);
  }, [connected, ready, update]);

  if (!connected)
    return (
      <GuestEmpty description="Connect your wallet to view and manage active payment streams." />
    );

  const activeRate = streams.filter((s) => s.running).reduce((a, s) => a + s.ratePerSec, 0);
  const totalStreamed = streams.reduce((a, s) => a + s.streamed, 0);

  const patch = (id: string, p: Partial<(typeof streams)[number]>) =>
    update((prev) => ({
      ...prev,
      streams: prev.streams.map((s) => (s.id === id ? { ...s, ...p } : s)),
    }));

  const create = () => {
    const rate = Number(form.rate);
    if (!form.name.trim() || !rate || rate <= 0) {
      toast.error("Add a recipient name and a rate above zero");
      return;
    }
    const stream = {
      id: randomId(),
      name: form.name.trim(),
      role: form.role.trim() || "Payment stream",
      address: form.address.trim() || "0x…",
      ratePerSec: rate,
      streamed: 0,
      running: true,
      createdAt: Date.now(),
    };
    update((p) => ({ ...p, streams: [stream, ...p.streams] }));
    notify({ kind: "stream", title: "Stream started", body: `${stream.name} · ${rate} USDC/s` });
    setForm({ name: "", role: "", address: "", rate: "0.0100" });
    setOpen(false);
    toast.success("Stream started");
  };

  return (
    <div className="space-y-4">
      <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">Payment streams</h3>
            <p className="text-xs break-words text-muted-foreground">
              Second-by-second USDC settlement for contractors and service providers.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CurrencySelect value={currency} onChange={setCurrency} />
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              <Plus className="size-4" /> New stream
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-secondary/50 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-name">Recipient</Label>
              <Input
                id="s-name"
                value={form.name}
                placeholder="Recipient name"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-role">Description</Label>
              <Input
                id="s-role"
                value={form.role}
                placeholder="e.g. Backend contractor"
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="bg-background/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-addr">Wallet address</Label>
              <Input
                id="s-addr"
                value={form.address}
                placeholder="0x…"
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="bg-background/40 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-rate">Rate (USDC / sec)</Label>
              <Input
                id="s-rate"
                inputMode="decimal"
                value={form.rate}
                placeholder="0.0100"
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value.replace(/[^\d.]/g, "") }))}
                className="bg-background/40 font-mono"
              />
            </div>
            <Button className="sm:col-span-2" onClick={create}>
              Start stream
            </Button>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Active streams", `${streams.filter((s) => s.running).length} / ${streams.length}`],
            ["Combined rate", `${activeRate.toFixed(4)} USDC/s`],
            ["Streamed to date", formatLocal(totalStreamed, currency)],
          ].map(([k, v]) => (
            <div key={k} className="w-full min-w-0 rounded-2xl bg-secondary/50 p-4">
              <p className="truncate text-[11px] tracking-wide text-muted-foreground uppercase">{k}</p>
              <p className="mt-1 truncate font-display text-xl font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {streams.length === 0 ? (
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium">No active streams</p>
            <p className="max-w-sm text-xs break-words text-muted-foreground">
              Start a stream to settle USDC to a contractor second by second on Arc.
            </p>
            <Button size="sm" className="motion-press" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> New stream
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {streams.map((s) => (
            <div key={s.id} className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${s.running ? "pulse-dot bg-mint" : "bg-muted-foreground"}`}
                    />
                    <span className="truncate font-semibold">{s.name}</span>
                  </p>
                  <p className="truncate text-xs break-words text-muted-foreground">{s.role}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] break-words text-muted-foreground">
                    {s.address}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    s.running ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.running ? "Streaming" : "Paused"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                  <p className="text-[11px] break-words text-muted-foreground">Streamed so far</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{s.streamed.toFixed(4)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    USDC · {formatLocal(s.streamed, currency)}
                  </p>
                </div>
                <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] break-words text-muted-foreground">
                    <Timer className="size-3" /> Rate
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums">{s.ratePerSec.toFixed(4)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    USDC/sec · {formatLocal(s.ratePerSec * 3600, currency)}/hr
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Slider
                  value={[Math.round(s.ratePerSec * 10000)]}
                  min={1}
                  max={500}
                  step={1}
                  aria-label={`Streaming rate for ${s.name}`}
                  onValueChange={([v]) => patch(s.id, { ratePerSec: (v ?? 1) / 10000 })}
                />
                <span className="shrink-0 rounded-full bg-background/50 px-2 py-1 font-mono text-[11px] tabular-nums">
                  {(s.ratePerSec * 86400).toFixed(2)}/day
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={s.running ? "secondary" : "default"}
                  onClick={() => {
                    patch(s.id, { running: !s.running });
                    toast(s.running ? `Stream paused · ${s.name}` : `Stream resumed · ${s.name}`);
                  }}
                >
                  {s.running ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {s.running ? "Pause" : "Resume"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    update((p) => ({ ...p, streams: p.streams.filter((x) => x.id !== s.id) }));
                    notify({
                      kind: "stream",
                      title: "Stream settled",
                      body: `${s.streamed.toFixed(2)} USDC settled to ${s.address}.`,
                    });
                    toast.success("Stream closed", {
                      description: `${s.streamed.toFixed(2)} USDC settled to ${s.address}.`,
                    });
                  }}
                >
                  <Square className="size-4" /> Close &amp; settle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast("Live on Arc", { description: "Finality under one second per tick." })}
                >
                  <Activity className="size-4" /> Activity
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] break-words text-muted-foreground">
        <Radio className="size-3" /> Streams tick every 250ms against Arc Mainnet · gas paid in USDC
      </p>
    </div>
  );
}
