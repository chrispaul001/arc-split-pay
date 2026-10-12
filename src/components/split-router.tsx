import { withLinkParams } from "@/lib/link-status.functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/currency-select";
import { formatLocal, getCurrency, useFxRates, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";
import { useBrand } from "@/lib/brand";
import { ImageUpload } from "@/components/image-upload";
import { Copy, Link2, Plus, Trash2, Wallet } from "lucide-react";
import { GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { randomId, useMerchantStore } from "@/lib/merchant-store";
import { useSplitSend } from "@/lib/use-split-send";
import { WalletStallHelper } from "@/components/wallet-stall-helper";
import { WALLET_TIMEOUT_MESSAGE, isCancelled, isTimeout } from "@/lib/wallet-guard";
import { errMessage } from "@/lib/use-pay";
import { showLinkPublished } from "@/components/link-share";
import { SendHorizontal as Send } from "lucide-react";
import { CHECKOUT_TOKENS, type CheckoutToken } from "@/lib/web3";



type Party = { id: number; name: string; address: string; bps: number };

const PALETTE = ["var(--electric)", "var(--mint)", "oklch(0.68 0.17 300)", "oklch(0.75 0.15 85)"];

const PRESETS: { label: string; bps: number[] }[] = [
  { label: "Creator 70/20/10", bps: [7000, 2000, 1000] },
  { label: "Marketplace 85/15", bps: [8500, 1500] },
  { label: "Tax vault 60/25/15", bps: [6000, 2500, 1500] },
];

let nextId = 4;

export function SplitRouter() {
  const connected = useWalletGate();
  const { product, setImage } = useBrand();
  const { address, update: saveMerchant, notify } = useMerchantStore();
  const { send: splitSend, phase, cancel: cancelSplit } = useSplitSend();
  const sending = phase !== "idle";

  const [mode, setMode] = useState<"link" | "send">("send");
  const [token, setToken] = useState<CheckoutToken>(CHECKOUT_TOKENS[0]);
  const sym = mode === "send" ? token.symbol : "USDC";
  const [total, setTotal] = useState("");
  const [reference, setReference] = useState("");
  const [linkName, setLinkName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [parties, setParties] = useState<Party[]>([
    { id: 1, name: "", address: "", bps: 10000 },
    { id: 2, name: "", address: "", bps: 0 },
  ]);

  useEffect(() => {
    if (address)
      setParties((ps) =>
        ps.map((p, i) => (i === 0 && !p.address ? { ...p, address, name: p.name || "Merchant treasury" } : p)),
      );
  }, [address]);


  const totalBps = parties.reduce((s, p) => s + p.bps, 0);
  const amount = Number(total) || 0;
  const balanced = totalBps === 10000;

  useFxRates();
  const c = getCurrency(currency);

  const link = useMemo(
    () =>
      `https://coindeccpay.lovable.app/s/${parties
        .map((p) => p.bps)
        .join("-")}?amt=${amount}&cur=${currency}&net=arc`,
    [parties, amount, currency],
  );

  const update = (id: number, patch: Partial<Party>) =>
    setParties((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const rebalance = () =>
    setParties((ps) => {
      const even = Math.floor(10000 / ps.length);
      return ps.map((p, i) => ({ ...p, bps: i === 0 ? 10000 - even * (ps.length - 1) : even }));
    });

  const clampBps = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(10000, Math.round(n))) : 0);

  const setPct = (id: number, raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    update(id, { bps: clampBps((Number.isFinite(n) ? n : 0) * 100) });
  };

  const maxRemainder = () =>
    setParties((ps) => {
      const last = ps[ps.length - 1];
      if (!last) return ps;
      const others = ps.slice(0, -1).reduce((s, p) => s + p.bps, 0);
      if (others <= 10000) return ps.map((p) => (p.id === last.id ? { ...p, bps: 10000 - others } : p));
      // others exceed total: scale them down proportionally, last gets 0
      let acc = 0;
      return ps.map((p, i) => {
        if (p.id === last.id) return { ...p, bps: 0 };
        const v = i === ps.length - 2 ? 10000 - acc : Math.floor((p.bps / others) * 10000);
        acc += v;
        return { ...p, bps: v };
      });
    });

  const applyPreset = (bps: number[]) =>
    setParties((ps) => {
      const base = ps.slice(0, bps.length);
      while (base.length < bps.length) {
        base.push({ id: nextId++, name: "New recipient", address: "", bps: 0 });
      }
      return base.map((p, i) => ({ ...p, bps: bps[i] ?? 0 }));
    });

  const toastRef = useRef<string | number | null>(null);
  const cancelSend = () => {
    cancelSplit();
    if (toastRef.current != null) toast.dismiss(toastRef.current);
    toastRef.current = null;
    toast("Transaction cancelled", { description: "If your wallet still shows a request, reject it there." });
  };

  const sendNow = async (): Promise<void> => {
    const id = toast.loading("Processing Split...", { description: "Confirm the transaction in your wallet." });
    toastRef.current = id;
    try {
      const hash = await splitSend(
        amount,
        parties.map(({ name, address, bps }) => ({ name, address, bps })),
        `Split${reference ? ` · ${reference}` : ""}`,
        token,
      );
      const n = parties.filter((p) => p.bps > 0).length;
      toast.success("Split complete", { id, description: `${amount} ${token.symbol} sent to ${n} recipient${n === 1 ? "" : "s"} in one transaction.` });
      notify({
        kind: "split",
        title: "Split sent on-chain",
        body: `${amount} ${token.symbol} routed to ${n} recipient${n === 1 ? "" : "s"} · ${hash.slice(0, 10)}…`,
      });
      setTotal("");
      setReference("");
    } catch (e) {
      if (isCancelled(e)) { toast.dismiss(id); return; }
      const msg = isTimeout(e) ? WALLET_TIMEOUT_MESSAGE
        : e instanceof Error && /Invalid wallet|total 100%|Enter an amount|Insufficient|too small|at least one/.test(e.message) ? e.message : errMessage(e);
      toast.error(msg, { id });
    } finally {
      if (toastRef.current === id) toastRef.current = null;
    }
  };

  if (!connected)
    return (
      <GuestEmpty description="Connect your wallet to create split-router links." />
    );

  return (

    <div className="grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="glass animate-rise w-full max-w-full space-y-5 rounded-3xl px-4 py-5 sm:px-5">
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1">
          {([
            ["send", "Direct Send"],
            ["link", "Create Payment Link"],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold break-words">Split-Router link builder</h3>
            <p className="text-xs break-words text-muted-foreground">
              Route incoming USDC across parties atomically at settlement.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <CurrencySelect value={currency} onChange={setCurrency} />
            <Button
              variant="secondary"
              size="sm"
              onClick={rebalance}
              title="Divides the split equally across all recipients"
              aria-label="Split evenly across all recipients"
            >
              Split Evenly
            </Button>
          </div>
        </div>

        <div className="flex w-full max-w-full flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.bps)}
              className="rounded-full bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/90 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>

        {mode === "send" && (
          <div className="space-y-2">
            <Label>Send with</Label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Token">
              {CHECKOUT_TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  role="radio"
                  aria-checked={t.symbol === token.symbol}
                  disabled={sending}
                  onClick={() => setToken(t)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                    t.symbol === token.symbol
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Total amount ({sym})</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={total}
              onChange={(e) => {
                const v = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                const dec = mode === "send" ? token.decimals : 6;
                if (v === "" || new RegExp(`^\\d*(\\.\\d{0,${dec}})?$`).test(v)) setTotal(v);
              }}
              className="bg-background/40 font-display text-lg"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {mode !== "send" || token.symbol === "USDC" ? (
                <>Customer sees {formatLocal(amount, currency)} · 1 USDC = {c.symbol}{c.rate.toLocaleString()}</>
              ) : token.symbol === "EURC" ? (
                <>Customer pays {amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} EURC · 1 EURC = €1</>
              ) : (
                <>Customer pays {amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} cirBTC · 1 cirBTC = 1 BTC</>
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Reference</Label>
            <Input
              id="ref"
              value={reference}
              placeholder="e.g. invoice number"
              onChange={(e) => setReference(e.target.value)}
              className="bg-background/40"
            />
          </div>
          {mode === "link" && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="link-name">Link name</Label>
            <Input
              id="link-name"
              value={linkName}
              placeholder="What is this link for?"
              onChange={(e) => setLinkName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          )}

        </div>

        <ImageUpload
          compact
          label="Product image"
          hint="PNG, JPG or SVG up to 2MB"
          value={product}
          onChange={(v) => setImage("product", v)}
        />

        <div className="space-y-3 border-t border-border/40 pt-4">
          {parties.map((p, i) => {
            const pct = p.bps / 100;
            return (
              <div key={p.id} className="w-full min-w-0 rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary/70">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                      <input
                        value={p.name}
                        placeholder="Recipient name or role, e.g. Creator / Treasury"
                        onChange={(e) => update(p.id, { name: e.target.value })}
                        className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
                      />
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center rounded-lg bg-background/50 px-2 py-1 focus-within:ring-2 focus-within:ring-ring">
                      <input
                        key={`pct-${p.bps}`}
                        defaultValue={pct.toFixed(2).replace(/\.?0+$/, "")}
                        inputMode="decimal"
                        aria-label={`Percentage for recipient ${i + 1}`}
                        onBlur={(e) => setPct(p.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="w-14 bg-transparent text-right font-display text-sm font-bold tabular-nums outline-none"
                      />
                      <span className="font-display text-sm font-bold">%</span>
                    </div>
                    {i > 0 && parties.length > 1 && (
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => {
                          // Return the removed share to the primary treasury so the total stays 100%.
                          setParties((ps) => {
                            const gone = ps.find((x) => x.id === p.id);
                            const rest = ps.filter((x) => x.id !== p.id);
                            return rest.map((x, j) => (j === 0 ? { ...x, bps: x.bps + (gone?.bps ?? 0) } : x));
                          });
                          if (p.bps > 0) toast(`${p.name || "Recipient"} removed`, { description: `${p.bps / 100}% returned to ${parties[0]?.name || "Merchant treasury"}.` });
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-40"
                        aria-label={`Remove ${p.name || "recipient"}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs break-words text-muted-foreground">
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
                    onValueChange={([v]) => update(p.id, { bps: v ?? 0 })}
                  />
                  <label className="flex shrink-0 items-center gap-1 rounded-full bg-background/50 px-2 py-1 font-mono text-[11px] tabular-nums focus-within:ring-2 focus-within:ring-ring">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={1}
                      value={p.bps}
                      aria-label={`Basis points for recipient ${i + 1}`}
                      onChange={(e) => update(p.id, { bps: clampBps(Number(e.target.value)) })}
                      className="w-14 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    bps
                  </label>
                </div>

                <p className="mt-2 text-xs break-words text-muted-foreground">
                  Receives{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {((amount * p.bps) / 10000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  </span>{" "}
                  <span className="tabular-nums">≈ {formatLocal((amount * p.bps) / 10000, currency)}</span>
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
              { id: nextId++, name: "New recipient", address: "", bps: 0 },
            ])
          }
        >
          <Plus className="size-4" /> Add recipient
        </Button>
      </div>

      <div className="glass animate-rise w-full max-w-full space-y-5 rounded-3xl px-4 py-5 sm:px-5">
        <h3 className="text-lg font-semibold">Allocation</h3>

        <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary/70">
          {parties.map((p, i) => (
            <div
              key={p.id}
              className="h-full transition-[width] duration-200"
              style={{
                width: `${Math.min(100, (p.bps / 10000) * 100)}%`,
                background: PALETTE[i % PALETTE.length],
              }}
            />
          ))}
        </div>

        <div
          className={`rounded-2xl px-3 py-2 text-xs font-medium tabular-nums transition-colors ${
            balanced
              ? "bg-mint/15 text-mint"
              : totalBps > 10000
                ? "bg-destructive/15 text-destructive"
                : "bg-electric/15 text-electric"
          }`}
        >
          {balanced
            ? "Balanced · 10,000 / 10,000 bps allocated"
            : totalBps > 10000
              ? `Over by ${(totalBps - 10000).toLocaleString()} bps · ${totalBps.toLocaleString()} / 10,000`
              : `Under by ${(10000 - totalBps).toLocaleString()} bps · ${totalBps.toLocaleString()} / 10,000`}
        </div>

        {!balanced && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={rebalance}>
              Balance evenly
            </Button>
            <Button variant="secondary" size="sm" onClick={maxRemainder}>
              {totalBps > 10000 ? "Trim last" : "Remainder → last"}
            </Button>
          </div>
        )}

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
              <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                <span className="block">{((amount * p.bps) / 10000).toLocaleString(undefined, { maximumFractionDigits: mode === "send" ? token.decimals : 2 })} {sym}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatLocal((amount * p.bps) / 10000, currency)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {mode === "send" ? (
          <>
            <p className="rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground">
              Every recipient is paid in one transaction on Arc — you sign once. The very first send also asks for a one-time {token.symbol} spending approval.
            </p>
            <Button className="w-full" disabled={!balanced || amount <= 0 || sending} onClick={sendNow}>
              <Send className="size-4" /> {phase === "approving" ? `Approving ${token.symbol}…` : phase === "processing" ? "Processing Split..." : "Send Now"}
            </Button>
            {sending && (
              <WalletStallHelper
                key={phase}
                label={phase === "approving" ? `Approving ${token.symbol}…` : "Processing Split..."}
                onCancel={cancelSend}
              />
            )}
          </>
        ) : (
        <>
        <div className="space-y-2 w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
          <p className="flex items-center gap-2 text-xs break-words text-muted-foreground">
            <Link2 className="size-3.5" /> Generated payment link
          </p>
          <p className="break-all font-mono text-[11px]">{link}</p>
        </div>

        <Button
          className="w-full"
          disabled={!balanced || amount <= 0 || !linkName.trim()}
          onClick={() => {
            const linkId = randomId();
            const saved = {
              id: linkId,
              name: linkName.trim(),
              reference: reference.trim(),
              amount,
              currency,
              parties: parties.map(({ name, address, bps }) => ({ name, address, bps })),
              url: address ? withLinkParams(link, linkId, address) : link,
              status: "Active" as const,
              createdAt: Date.now(),
            };
            saveMerchant((p) => ({ ...p, links: [saved, ...p.links] }));
            notify({
              kind: "split",
              title: "Payment link published",
              body: `${saved.name} · ${amount} USDC across ${parties.length} recipients.`,
              linkUrl: saved.url,
            });
            showLinkPublished({
              url: saved.url,
              name: saved.name,
              amount: saved.amount,
              currency: saved.currency,
              parties: saved.parties,
            });
            setLinkName("");
            setReference("");
            setTotal("");
          }}
        >
          <Copy className="size-4" /> Publish link
        </Button>
        </>
        )}


      </div>
    </div>
  );
}
