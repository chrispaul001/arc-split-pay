import { Web3Provider } from "@/components/web3-provider";
import { OnchainCheckout } from "@/components/onchain-checkout";
import { formatLocal, type CurrencyCode } from "@/lib/currency";

export type PayLinkProps = { id: string; amount: number; currency: CurrencyCode };

export default function PayLinkApp({ id, amount, currency }: PayLinkProps) {
  const shares = id
    .split("-")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const total = shares.reduce((a, b) => a + b, 0);
  return (
    <Web3Provider>
      <div className="app-gradient flex min-h-screen w-full justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-foreground">CoindeccPay</p>
            <p className="text-xs text-muted-foreground">Secure USDC payment on Arc</p>
          </div>
          <div className="glass rounded-3xl px-5 py-5">
            <p className="text-xs text-muted-foreground">Amount due</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {amount > 0 ? `${amount.toLocaleString()} USDC` : "Enter amount below"}
            </p>
            {amount > 0 && currency !== "USD" && (
              <p className="text-xs text-muted-foreground tabular-nums">≈ {formatLocal(amount, currency)}</p>
            )}
            {shares.length > 1 && total > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs text-muted-foreground">Split between {shares.length} recipients</p>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                  {shares.map((s, i) => (
                    <div
                      key={i}
                      className={i % 2 ? "h-full bg-mint" : "h-full bg-primary"}
                      style={{ width: `${(s / total) * 100}%` }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {shares.map((s) => `${(s / 100).toFixed(s % 100 ? 2 : 0)}%`).join(" · ")}
                </p>
              </div>
            )}
          </div>
          <OnchainCheckout fixedAmount={amount > 0 ? amount : undefined} />
        </div>
      </div>
    </Web3Provider>
  );
}
