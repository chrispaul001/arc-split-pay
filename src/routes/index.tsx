import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { BrandTile } from "@/components/brand-tile";

// The wallet libraries (RainbowKit / Wagmi / MetaMask SDK) crash when evaluated
// on the edge server, so the whole dashboard is loaded only in the browser.
const DashboardApp = lazy(() => import("@/components/dashboard-app"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoindeccPay - Accept, Split & Stream USDC" },
      {
        name: "description",
        content:
          "Non-custodial payment infrastructure on Arc Network—powering direct payments, multi-wallet splits, and real-time streaming payouts in a single signature.",
      },
      { property: "og:title", content: "CoindeccPay - Accept, Split & Stream USDC" },
      {
        property: "og:description",
        content:
          "Non-custodial payment infrastructure on Arc Network—powering direct payments, multi-wallet splits, and real-time streaming payouts in a single signature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function LoadingShell() {
  return (
    <div
      role="status"
      aria-label="Loading CoindeccPay"
      className="app-gradient relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6"
    >
      <div className="relative w-full max-w-[340px] rounded-3xl border border-border/60 bg-card/75 p-8 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3.5">
            <div className="splash-sheen relative overflow-hidden rounded-2xl">
              <BrandTile decorative className="size-14" />
            </div>
            <div className="text-left">
              <p className="font-display text-2xl font-bold tracking-tight text-foreground">CoindeccPay</p>
              <p className="text-xs font-medium text-muted-foreground">Accept, Split &amp; Stream USDC</p>
            </div>
          </div>
          <div className="relative mt-8 h-[1.5px] w-full overflow-hidden rounded-full bg-border/70">
            <span className="splash-trail absolute inset-y-0 w-2/5 rounded-full" />
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-secondary/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <span className="splash-beacon size-1.5 rounded-full bg-primary" />
            Connecting to Arc Network
          </p>
        </div>
      </div>
    </div>
  );
}

function Home() {
  return (
    <ClientOnly fallback={<LoadingShell />}>
      <Suspense fallback={<LoadingShell />}>
        <DashboardApp />
      </Suspense>
    </ClientOnly>
  );
}
