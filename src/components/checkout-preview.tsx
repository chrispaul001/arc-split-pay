import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyPills } from "@/components/currency-select";
import { formatLocal, formatUsdc, getCurrency, useFxRates, type CurrencyCode } from "@/lib/currency";
import { useBrand } from "@/lib/brand";
import { ImageUpload } from "@/components/image-upload";
import { Check, Copy, Loader2, Lock, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/reveal";
import { useConnectWallet } from "@/lib/use-connect";
import { errMessage, usePay } from "@/lib/use-pay";
import { TxProgress } from "@/components/tx-progress";
import { explorerTx } from "@/lib/web3";
import { useAccount } from "wagmi";


export function CheckoutPreview() {
  const [state, setState] = useState<"idle" | "paying" | "done">("idle");
  const [receipt, setReceipt] = useState<{ hash: string; sender: string; amount: number; timestamp: number } | null>(null);
  const { address } = useAccount();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [copied, setCopied] = useState(false);
  const [amountInput, setAmountInput] = useState("10");
  const parsedAmount = Number(amountInput);
  const AMOUNT = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const { connect: connectWallet } = useConnectWallet();
  const { logo, product, setImage, businessName } = useBrand();
  const fx = useFxRates();
  const c = getCurrency(currency);

  const SNIPPET = `<script src="https://coindeccpay.lovable.app/pay.js"></script>
<div data-coindecc-pay
     data-amount="${AMOUNT}"
     data-display="${currency}"
     data-network="arc"
     data-split="5000-5000">
</div>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      toast.success("Copied", { description: "Embed snippet copied to clipboard." });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed", { description: "Clipboard access was blocked by the browser." });
    }
  };

  const payFlow = usePay();
  const pay = async () => {
    if (!payFlow.isConnected) {
      connectWallet();
      return;
    }
    if (AMOUNT <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setState("paying");
    try {
      const hash = await payFlow.execute(String(AMOUNT));
      setReceipt({ hash, sender: address ?? "", amount: AMOUNT, timestamp: Date.now() });
      setState("done");
      toast.success("Payment settled on Arc");
    } catch (e) {
      setState("idle");
      toast.error("Transaction failed", { description: errMessage(e) });
    }
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

        <div className="mt-4 space-y-1.5">
          <label htmlFor="widget-amount" className="text-xs font-medium">Amount (USDC)</label>
          <input
            id="widget-amount"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value.replace(/[^0-9.]/g, ""));
              if (state === "done") { setState("idle"); setReceipt(null); }
            }}
            placeholder="0.00"
            className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">Set any test amount that fits your wallet balance.</p>
        </div>

        <div className="mt-4">
          <ImageUpload
            label="Product image (optional)"
            hint="Shown at the top of this checkout session · PNG, JPG or SVG"
            value={product}
            onChange={(v) => setImage("product", v)}
          />
        </div>


        <div className={`mt-4 rounded-3xl border border-border bg-background/45 px-4 py-5 backdrop-blur-xl sm:px-5 ${state === "done" ? "glow-border" : ""}`}>
          {product && (
            <img
              src={product}
              alt="Product"
              className="mb-4 h-32 w-full rounded-2xl border border-border object-cover"
            />
          )}
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2 text-xs break-words text-muted-foreground">
                {logo && (
                  <img src={logo} alt="" className="size-5 shrink-0 rounded-md object-cover" />
                )}
                <span className="truncate">Pay {businessName}</span>
              </p>

              <p className="font-display text-3xl font-bold tabular-nums">
                {formatLocal(AMOUNT, currency)}
              </p>
              <p className="text-[11px] break-words text-muted-foreground tabular-nums">
                ≈ {(AMOUNT * c.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {c.code} settles
                as {formatUsdc(AMOUNT)}
              </p>
              <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                {fx.source === "live" && <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" aria-hidden="true" />}
                <span className="truncate">
                  1 USDC = {c.symbol}{c.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                  {fx.source === "live" ? "Live rate" : fx.source === "cached" ? "Recent rate" : "Indicative rate"}
                  {fx.updatedAt > 0 && ` · updated ${new Date(fx.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </p>
              {currency !== "USD" && fx.updatedAt > 0 && (
                <p className="text-[10px] text-muted-foreground">Quote held for 5 minutes during checkout.</p>
              )}
            </div>

          </div>

          {state !== "done" ? (
            <div className="mt-4 space-y-2 text-sm">
              {[
                ["Network", "Arc Testnet"],
                ["Settlement currency", "USDC"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">{k}</span>
                  <span className="truncate text-right font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          ) : receipt ? (
            <div className="animate-rise mt-4 space-y-3">
              <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {logo && <img src={logo} alt="" className="size-4 rounded object-cover" />} Receipt
                </p>
                <div className="mt-2 space-y-1.5 text-xs">
                  {receipt.sender && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Sender</span><span className="min-w-0 break-all text-right font-mono">{receipt.sender}</span></div>}
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">{formatUsdc(receipt.amount)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Timestamp</span><span className="text-right">{new Date(receipt.timestamp).toLocaleString()}</span></div>
                  <div className="flex justify-between gap-3"><span className="shrink-0 text-muted-foreground">Explorer hash</span><a href={explorerTx(receipt.hash)} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-right font-mono text-primary hover:underline">{receipt.hash}</a></div>
                </div>
              </div>
            </div>
          ) : null}

          <Button
            className="mt-5 w-full transition-transform active:scale-[0.98]"
            size="lg"
            disabled={state === "paying" || AMOUNT <= 0}
            onClick={() => void pay()}
          >
            {state === "idle" && (
              <>
                <Wallet className="size-4" /> Pay {formatLocal(AMOUNT, currency)}
              </>
            )}
            {state === "paying" && (
              <>
                <Loader2 className="size-4 animate-spin" /> Settling on network…
              </>
            )}
            {state === "done" && (
              <>
                 <Check className="size-4" /> Paid
              </>
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] break-words text-muted-foreground">
            <Lock className="size-3" /> Secured by CoindeccPay
          </p>
        </div>

        {(payFlow.approve.status !== "idle" || payFlow.pay.status !== "idle") && (
          <div className="mt-4">
            <TxProgress
              steps={[
                { key: "approve", label: "Approve USDC spend", description: "Allow CoindeccPay to move USDC", ...payFlow.approve },
                { key: "pay", label: "Execute pay()", description: "Settle on the CoindeccPay contract", ...payFlow.pay },
              ]}
            />
          </div>
        )}
      </div>

      <div className="w-full min-w-0 space-y-4">
        <Reveal>
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

        </Reveal>

        <Reveal delay={90}>
        <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Embed snippet</p>
            <button
              onClick={copySnippet}
              aria-label="Copy embed snippet"
              className="motion-press inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              {copied ? <Check className="size-3.5 text-mint" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 w-full max-w-full overflow-hidden rounded-2xl bg-background/50 p-4 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
            {SNIPPET}
          </pre>
        </div>
        </Reveal>
      </div>
    </div>
  );
}
