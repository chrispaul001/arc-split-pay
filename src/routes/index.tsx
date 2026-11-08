import { lazy, Suspense, useCallback, useEffect, useState } from "react";
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

function LoadingShell({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading CoindeccPay"
      className={`launch-screen app-gradient relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 ${
        leaving ? "launch-screen--leaving" : ""
      }`}
    >
      <div aria-hidden="true" className="launch-atmosphere pointer-events-none absolute inset-0 overflow-hidden">
        <span className="launch-bloom absolute left-1/2 top-1/2 block" />
        <span className="launch-ring absolute left-1/2 top-1/2 block rounded-full" />
      </div>

      <div className="launch-lockup relative z-10 flex flex-col items-center text-center">
        <div className="launch-mark relative">
          <span aria-hidden="true" className="launch-mark-halo absolute -inset-7 rounded-full" />
          <BrandTile decorative sheen className="relative size-20 sm:size-24" />
        </div>

        <div className="launch-copy mt-7">
          <p className="font-display text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
            CoindeccPay
          </p>
          <p className="mt-2 text-sm font-medium tracking-wide text-muted-foreground">
            Accept, Split &amp; Stream USDC
          </p>
        </div>

        <p className="launch-status mt-8 inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-[var(--glow-soft)] backdrop-blur-xl">
          <span className="splash-beacon size-1.5 rounded-full bg-primary" />
          Connecting to Arc Network
        </p>
      </div>
    </div>
  );
}

const INTRO_MS = 1800;
const FADE_MS = 500;

function Home() {
  const [phase, setPhase] = useState<"hold" | "leaving" | "done">("hold");

  useEffect(() => {
    const leaveTimer = setTimeout(() => setPhase("leaving"), INTRO_MS);
    const doneTimer = setTimeout(() => setPhase("done"), INTRO_MS + FADE_MS);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <ClientOnly fallback={<LoadingShell />}>
      <Suspense fallback={<LoadingShell />}>
        <div className={`dashboard-unlock ${phase === "hold" ? "" : "dashboard-unlock--active"}`}>
          <DashboardApp />
        </div>
        {phase !== "done" && (
          <div className={`fixed inset-0 z-[100] ${phase === "leaving" ? "pointer-events-none" : ""}`}>
            <LoadingShell leaving={phase === "leaving"} />
          </div>
        )}
      </Suspense>
    </ClientOnly>
  );
}
