import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyPills } from "@/components/currency-select";
import { formatLocal, formatUsdc, getCurrency, type CurrencyCode } from "@/lib/currency";
import { useBrand } from "@/lib/brand";
import { ImageUpload } from "@/components/image-upload";
import { Check, Fuel, Loader2, Lock, RotateCcw, Timer, Wallet, Zap } from "lucide-react";

const AMOUNT = 1250;

const SPLIT = [
  { name: "Merchant treasury", address: "0x8fA2…4c19", bps: 7000 },
  { name: "Co-creator", address: "0x21Bd…9e07", bps: 2000 },
  { name: "Tax vault", address: "0xC730…11aa", bps: 1000 },
];

export function CheckoutPreview() {
  const [state, setState] = useState<"idle" | "paying" | "done">("idle");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const { logo, product, setImage } = useBrand();
  const c = getCurrency(currency);

  const pay = () => {
    setState("paying");
    window.setTimeout(() => setState("done"), 1100);
  };

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
        <h3 className="text-lg font-semibold">Embedded checkout widget</h3>
        <p className="mt-1 text-xs break-words text-muted-foreground">
          Exactly what your customer sees. Drop it in with one script tag.
        </p>

        <div className="mt-4">
          <CurrencyPills value={currency} onChange={setCurrency} />
        </div>

        <div className={`mt-4 rounded-3xl border border-border bg-background/45 px-4 py-5 backdrop-blur-xl sm:px-5 ${state === "done" ? "glow-border" : ""}`}>
          {product && (
            <img
              src={product}
              alt="Product"
              className="mb-4 h-32 w-full rounded-2xl border border-border object-cover"
            />
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2 text-xs break-words text-muted-foreground">
                {logo && (
                  <img src={logo} alt="" className="size-5 shrink-0 rounded-md object-cover" />
                )}
                <span className="truncate">Pay Nova Studio</span>
              </p>

              <p className="font-display text-3xl font-bold tabular-nums transition-all duration-300">
                {formatLocal(AMOUNT, currency)}
              </p>
              <p className="text-[11px] break-words text-muted-foreground tabular-nums">
                ≈ {(AMOUNT * c.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {c.code} converted
                instantly to {formatUsdc(AMOUNT)} at market rate
              </p>
              <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                1 USDC = {c.symbol}
                {c.rate.toLocaleString()}
              </p>
            </div>

            <span className="pulse-emerald inline-flex shrink-0 items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-semibold text-mint">
              <Timer className="size-3.5" /> &lt;1s settle
            </span>
          </div>

          {state !== "done" ? (
            <div className="mt-4 space-y-2 text-sm">
              {[
                ["Order", "order-8842"],
                ["Network", "Arc Mainnet"],
                ["Gas paid in", "USDC (zero-gas for buyer)"],
                ["Settlement currency", `${c.code} → USDC`],
                ["Split parties", String(SPLIT.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">{k}</span>
                  <span className="truncate text-right font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-rise mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="pulse-emerald inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-semibold text-mint">
                  <Check className="size-3.5" /> Final in 0.62s
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Fuel className="size-3.5" /> Buyer paid 0 gas
                </span>
              </div>

              <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Receipt</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  {[
                    ["Tx hash", "0x7c41…e9a2"],
                    ["Block", "18,442,901"],
                    ["Charged", formatLocal(AMOUNT, currency)],
                    ["Settled", formatUsdc(AMOUNT)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">{k}</span>
                      <span className="truncate font-mono tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Atomic split executed
                </p>
                <ul className="mt-2 divide-y divide-border/60">
                  {SPLIT.map((s) => (
                    <li
                      key={s.name}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-xs first:pt-1"
                    >
                      <span className="min-w-0 leading-relaxed">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground tabular-nums">
                          {s.address} · {(s.bps / 100).toFixed(2)}%
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono leading-relaxed tabular-nums">
                        <span className="block">{((AMOUNT * s.bps) / 10000).toFixed(2)} USDC</span>
                        <span className="block font-mono text-[10px] text-muted-foreground tabular-nums">
                          {formatLocal((AMOUNT * s.bps) / 10000, currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Button
            className="mt-5 w-full transition-transform active:scale-[0.98]"
            size="lg"
            disabled={state !== "idle"}
            onClick={pay}
          >
            {state === "idle" && (
              <>
                <Wallet className="size-4" /> Pay {formatLocal(AMOUNT, currency)}
              </>
            )}
            {state === "paying" && (
              <>
                <Loader2 className="size-4 animate-spin" /> Settling on Arc…
              </>
            )}
            {state === "done" && (
              <>
                <Check className="size-4" /> Paid · split executed
              </>
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] break-words text-muted-foreground">
            <Lock className="size-3" /> Secured by Coindecc Pay
          </p>
        </div>

        {state === "done" && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setState("idle")}
            className="mt-4 w-full border border-border font-semibold transition-transform active:scale-[0.98]"
          >
            <RotateCcw className="size-4" /> Reset preview
          </Button>
        )}
      </div>

      <div className="w-full min-w-0 space-y-4">
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <h3 className="text-lg font-semibold">Why it converts</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              ["Local pricing", "Shoppers see NGN, GHS, KES, ZAR or USD — you settle in USDC."],
              ["Sub-second settlement", "Funds finalize on Arc before the page animation ends."],
              ["Zero-gas buyer", "Native USDC gas is sponsored — no second token required."],
              ["Atomic splits", "Every party is paid in the same transaction."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3 w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <Zap className="mt-0.5 size-4 shrink-0 text-mint" />
                <div className="min-w-0">
                  <p className="font-medium">{t}</p>
                  <p className="text-xs break-words text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Embed snippet</p>
          <pre className="mt-3 w-full max-w-full overflow-hidden rounded-2xl bg-background/50 p-4 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
            {`<script src="https://cdn.coindecc.xyz/pay.js"></script>
<div data-coindecc-pay
     data-amount="1250"
     data-display="${currency}"
     data-network="arc"
     data-split="7000-2000-1000">
</div>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
