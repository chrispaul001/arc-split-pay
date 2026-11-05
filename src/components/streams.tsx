import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CurrencySelect } from "@/components/currency-select";
import { formatLocal, useFxRates, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";
import { Activity, Pause, Play, Plus, Radio, Send, Square, Timer, X } from "lucide-react";
import { isAddress } from "viem";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { randomId, useMerchantStore, type MerchantStream } from "@/lib/merchant-store";
import { useStreamSettle } from "@/lib/use-stream-settle";
import { errMessage } from "@/lib/use-pay";
import { explorerTx } from "@/lib/web3";

type PricingMode = "sec" | "hour" | "day" | "budget";

const MODES: Record<PricingMode, { label: string; inputLabel: string; placeholder: string; suffix: string; divisor: number }> = {
  sec: { label: "Per second", inputLabel: "Rate per second", placeholder: "0.01", suffix: "/sec", divisor: 1 },
  hour: { label: "Per hour", inputLabel: "Rate per hour", placeholder: "25", suffix: "/hr", divisor: 3600 },
  day: { label: "Per day", inputLabel: "Rate per day", placeholder: "200", suffix: "/day", divisor: 86400 },
  budget: { label: "Total fixed budget", inputLabel: "Total budget", placeholder: "1000", suffix: "total", divisor: 0 },
};

function toPerSecond(mode: PricingMode, amount: string, durationHours: string) {
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return 0;
  if (mode === "budget") {
    const h = Number(durationHours);
    return Number.isFinite(h) && h > 0 ? a / (h * 3600) : 0;
  }
  return a / MODES[mode].divisor;
}

const MAX_DAY = 500;
const PRESETS = [10, 25, 50, 100];

function RateControl({
  name,
  ratePerSec,
  onChange,
}: {
  name: string;
  ratePerSec: number;
  onChange: (r: number) => void;
}) {
  const perDay = ratePerSec * 86400;
  const [draft, setDraft] = useState(perDay.toFixed(2));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(perDay.toFixed(2));
  }, [perDay, editing]);

  const commit = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) {
      setDraft(perDay.toFixed(2));
      return;
    }
    onChange(Math.min(v, 100000) / 86400);
  };

  return (
    <div className="mt-4 rounded-2xl bg-secondary/40 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`rate-${name}`} className="text-[11px] text-muted-foreground">
          Daily rate
        </Label>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/70 px-2 focus-within:ring-2 focus-within:ring-ring">
          <Input
            id={`rate-${name}`}
            inputMode="decimal"
            value={draft}
            onFocus={(e) => {
              setEditing(true);
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={() => {
              setEditing(false);
              commit(Number(draft));
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-9 w-24 border-0 bg-transparent px-1 text-right font-mono text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0"
          />
          <span className="text-[11px] text-muted-foreground">USDC/day</span>
        </div>
      </div>
      <Slider
        className="mt-4 py-2 [&_[role=slider]]:size-6 [&_[role=slider]]:shadow-md [&_[role=slider]]:transition-transform [&_[role=slider]]:active:scale-110 touch-none"
        value={[Math.min(perDay, MAX_DAY)]}
        min={1}
        max={MAX_DAY}
        step={0.5}
        aria-label={`Daily rate for ${name}`}
        onValueChange={([v]) => onChange((v ?? 1) / 86400)}
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p / 86400)}
            className={`h-9 rounded-xl text-xs font-semibold tabular-nums transition-colors motion-press ${
              Math.abs(perDay - p) < 0.01
                ? "bg-primary text-primary-foreground"
                : "bg-background/60 text-foreground hover:bg-background"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Streams() {
  const connected = useWalletGate();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  useFxRates();
  const { data, ready, update, notify } = useMerchantStore();
  const { settle, busyId } = useStreamSettle();
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const emptyForm = { name: "", role: "", address: "", mode: "hour" as PricingMode, amount: "", duration: "" };
  const [form, setForm] = useState(emptyForm);
  const computedRate = toPerSecond(form.mode, form.amount, form.duration);

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
      <GuestEmpty description="Connect your wallet to manage streams." />
    );

  const activeRate = streams.filter((s) => s.running).reduce((a, s) => a + s.ratePerSec, 0);
  const totalStreamed = streams.reduce((a, s) => a + s.streamed, 0);

  const patch = (id: string, p: Partial<(typeof streams)[number]>) =>
    update((prev) => ({
      ...prev,
      streams: prev.streams.map((s) => (s.id === id ? { ...s, ...p } : s)),
    }));

  const doSettle = async (s: MerchantStream, close: boolean) => {
    const due = Math.max(0, s.streamed - (s.settled ?? 0));
    if (due < 0.000001) {
      if (close) {
        update((p) => ({ ...p, streams: p.streams.filter((x) => x.id !== s.id) }));
        toast("Stream closed", { description: "Nothing left to settle." });
      } else toast("Nothing to settle yet");
      return;
    }
    if (close) patch(s.id, { running: false });
    const toastId = toast.loading(`Confirm ${due.toFixed(4)} USDC in your wallet…`);
    try {
      const hash = await settle(s.id, s.address, due, { kind: "stream", label: `Stream · ${s.name}` });
      update((p) => ({
        ...p,
        streams: close
          ? p.streams.filter((x) => x.id !== s.id)
          : p.streams.map((x) =>
              x.id === s.id ? { ...x, settled: (x.settled ?? 0) + due, lastSettleTx: hash } : x,
            ),
      }));
      notify({
        kind: "stream",
        title: close ? "Stream closed & settled" : "Stream payout settled",
        body: `${due.toFixed(4)} USDC sent to ${s.address} on Arc.`,
      });
      toast.success("Settled on Arc", { id: toastId, description: `${due.toFixed(4)} USDC · ${hash.slice(0, 10)}…` });
    } catch (e) {
      toast.error("Settlement failed", { id: toastId, description: errMessage(e) });
    }
  };

  const create = () => {
    const rate = computedRate;
    if (!form.name.trim() || !rate || rate <= 0) {
      toast.error(
        form.mode === "budget"
          ? "Add a recipient name, a budget and a duration above zero"
          : "Add a recipient name and a rate above zero",
      );
      return;
    }
    if (!isAddress(form.address.trim())) {
      toast.error("Enter a valid recipient wallet address (0x…)");
      return;
    }
    const stream = {
      id: randomId(),
      name: form.name.trim(),
      role: form.role.trim() || "Payment stream",
      address: form.address.trim(),
      ratePerSec: rate,
      streamed: 0,
      running: true,
      createdAt: Date.now(),
    };
    update((p) => ({ ...p, streams: [stream, ...p.streams] }));
    notify({ kind: "stream", title: "Stream started", body: `${stream.name} · ${rate.toFixed(6)} USDC/s` });
    setForm(emptyForm);
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
            {open ? (
              <Button size="sm" variant="outline" className="h-10 touch-manipulation px-4" onClick={() => setOpen(false)}>
                <X className="size-4" /> Cancel
              </Button>
            ) : (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> New stream
              </Button>
            )}
          </div>
        </div>

        <div
          aria-hidden={!open}
          inert={!open}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
            open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid gap-3 rounded-2xl bg-secondary/50 p-4 sm:grid-cols-2">
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
              <Label htmlFor="s-mode">Pricing mode</Label>
              <select
                id="s-mode"
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as PricingMode }))}
                className="h-9 w-full rounded-md border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(MODES) as PricingMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODES[m].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-rate">{MODES[form.mode].inputLabel}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="s-rate"
                  inputMode="decimal"
                  value={form.amount}
                  placeholder={MODES[form.mode].placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") }))}
                  className="bg-background/40 pr-14 pl-7 font-mono"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  {MODES[form.mode].suffix}
                </span>
              </div>
            </div>
            {form.mode === "budget" && (
              <div className="space-y-2">
                <Label htmlFor="s-dur">Duration (hours)</Label>
                <Input
                  id="s-dur"
                  inputMode="decimal"
                  value={form.duration}
                  placeholder="e.g. 40"
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value.replace(/[^\d.]/g, "") }))}
                  className="bg-background/40 font-mono"
                />
              </div>
            )}
            <div className="rounded-xl bg-background/40 p-3 text-xs sm:col-span-2">
              <p className="text-muted-foreground">Equivalent rate</p>
              <p className="font-mono text-sm font-semibold tabular-nums">
                {computedRate > 0 ? `${computedRate.toFixed(8)} USDC / sec` : "—"}
              </p>
              {computedRate > 0 && (
                <p className="text-muted-foreground tabular-nums">
                  ≈ {(computedRate * 3600).toFixed(2)} USDC/hr · {(computedRate * 86400).toFixed(2)} USDC/day
                </p>
              )}
            </div>
            <Button className="sm:col-span-2" onClick={create}>
              Start stream
            </Button>
            </div>
          </div>
        </div>

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

      {streams.length === 0 && !open ? (
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium">No active streams</p>
            <p className="max-w-sm text-xs break-words text-muted-foreground">
              Create a stream to start real-time payouts.
            </p>
            <Button size="sm" className="motion-press" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> New stream
            </Button>
          </div>
        </div>
      ) : streams.length > 0 ? (
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

              <RateControl
                name={s.name}
                ratePerSec={s.ratePerSec}
                onChange={(r) => patch(s.id, { ratePerSec: r })}
              />

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                  disabled={busyId !== null || s.streamed <= 0}
                  onClick={() => void doSettle(s, false)}
                >
                  <Send className="size-4" />
                  {busyId === s.id ? "Settling…" : `Pay out ${s.streamed.toFixed(2)} USDC`}
                </Button>
                {confirmEnd === s.id ? (
                  <div className="col-span-2 flex w-full flex-wrap items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 animate-rise">
                    <p className="min-w-0 flex-1 text-xs">
                      End this stream? Any remaining {s.streamed.toFixed(2)} USDC is paid out and the stream stops for good.
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(null)}>
                      Keep
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId !== null}
                      onClick={() => {
                        setConfirmEnd(null);
                        void doSettle(s, true);
                      }}
                    >
                      <Square className="size-4" /> End stream
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId !== null}
                    onClick={() => setConfirmEnd(s.id)}
                  >
                    <Square className="size-4" /> End stream
                  </Button>
                )}
                {s.lastSettleTx && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={explorerTx(s.lastSettleTx)} target="_blank" rel="noreferrer">
                      <Activity className="size-4" /> Last payout
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 text-[11px] break-words text-muted-foreground">
        <Radio className="size-3" /> Accrues live · payouts are signed by your wallet on Arc
      </p>
    </div>
  );
}
