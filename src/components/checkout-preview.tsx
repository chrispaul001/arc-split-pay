import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Lock, Timer, Wallet, Zap } from "lucide-react";

export function CheckoutPreview() {
  const [state, setState] = useState<"idle" | "paying" | "done">("idle");

  const pay = () => {
    setState("paying");
    window.setTimeout(() => setState("done"), 1100);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="glass animate-rise rounded-3xl p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Embedded checkout widget</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Exactly what your customer sees. Drop it in with one script tag.
        </p>

        <div className="mt-5 rounded-3xl border border-border bg-background/45 p-5 backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Pay Nova Studio</p>
              <p className="font-display text-3xl font-bold tabular-nums">1,250.00 USDC</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-semibold text-mint">
              <Timer className="size-3.5" /> &lt;1s settle
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Order", "order-8842"],
              ["Network", "Arc Mainnet"],
              ["Gas paid in", "USDC"],
              ["Split parties", "3"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="truncate font-medium">{v}</span>
              </div>
            ))}
          </div>

          <Button
            className="mt-5 w-full transition-transform active:scale-[0.98]"
            size="lg"
            disabled={state !== "idle"}
            onClick={pay}
          >
            {state === "idle" && (
              <>
                <Wallet className="size-4" /> Pay with USDC
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

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Secured by Coindecc Pay
          </p>
        </div>

        {state === "done" && (
          <button
            onClick={() => setState("idle")}
            className="mt-3 w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Reset preview
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="glass animate-rise rounded-3xl p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Why it converts</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              ["Sub-second settlement", "Funds finalize on Arc before the page animation ends."],
              ["USDC gas", "Customers never hold a second token to pay."],
              ["One-click pay", "Wallet session reused across the merchant network."],
              ["Atomic splits", "Every party is paid in the same transaction."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3 rounded-2xl bg-secondary/50 p-3">
                <Zap className="mt-0.5 size-4 shrink-0 text-mint" />
                <div className="min-w-0">
                  <p className="font-medium">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass animate-rise rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Embed snippet</p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-background/50 p-4 font-mono text-[11px] leading-relaxed">
            {`<script src="https://cdn.coindecc.xyz/pay.js"></script>
<div data-coindecc-pay
     data-amount="1250"
     data-network="arc"
     data-split="7000-2000-1000">
</div>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
