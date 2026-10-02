import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { PayLinkProps } from "@/components/pay-link-app";
import type { CurrencyCode } from "@/lib/currency";

const PayLinkApp = lazy(() => import("@/components/pay-link-app"));

const CODES: CurrencyCode[] = ["USD", "NGN", "GHS", "KES", "ZAR"];

export function parsePaySearch(s: Record<string, unknown>) {
  const amt = Number(s['amt']);
  const cur = String(s['cur'] ?? "USD").toUpperCase() as CurrencyCode;
  const lnk = typeof s['lnk'] === "string" ? s['lnk'] : undefined;
  const m = typeof s['m'] === "string" ? s['m'] : undefined;
  return {
    amt: Number.isFinite(amt) && amt > 0 ? amt : 0,
    cur: CODES.includes(cur) ? cur : ("USD" as CurrencyCode),
    ...(lnk ? { lnk } : {}),
    ...(m ? { m } : {}),
  };
}

function Shell() {
  return (
    <div className="app-gradient flex min-h-screen items-center justify-center">
      <p className="text-xs text-muted-foreground">Loading checkout…</p>
    </div>
  );
}

export function PayLinkPage(props: PayLinkProps) {
  return (
    <ClientOnly fallback={<Shell />}>
      <Suspense fallback={<Shell />}>
        <PayLinkApp {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export const payHead = () => ({
  meta: [
    { title: "Pay with USDC | CoindeccPay" },
    { name: "description", content: "Complete this USDC payment securely on Arc with CoindeccPay." },
    { property: "og:title", content: "Pay with USDC | CoindeccPay" },
    { property: "og:description", content: "Complete this USDC payment securely on Arc with CoindeccPay." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
