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
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl splash-glow" />
      <div className="relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="flex items-center gap-3.5">
          <BrandTile decorative className="size-14" />
          <div className="text-left">
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">CoindeccPay</p>
            <p className="text-xs font-medium text-muted-foreground">Accept, Split &amp; Stream USDC</p>
          </div>
        </div>
        <div className="relative mt-9 h-0.5 w-44 overflow-hidden rounded-full bg-border">
          <span className="splash-bar absolute inset-y-0 w-1/3 rounded-full bg-primary" />
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="pulse-dot size-1.5 rounded-full bg-primary" />
          Connecting to Arc Network
        </p>
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
