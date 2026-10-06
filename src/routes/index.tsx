import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

// The wallet libraries (RainbowKit / Wagmi / MetaMask SDK) crash when evaluated
// on the edge server, so the whole dashboard is loaded only in the browser.
const DashboardApp = lazy(() => import("@/components/dashboard-app"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoindeccPay — Instant USDC Payment Gateway & Split Routing" },
      {
        name: "description",
        content:
          "Deploy embeddable USDC checkout links and automated split-routing on Arc Network.",
      },
      {
        property: "og:title",
        content: "CoindeccPay — Instant USDC Payment Gateway & Split Routing",
      },
      {
        property: "og:description",
        content:
          "Deploy embeddable USDC checkout links and automated split-routing on Arc Network.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://coindeccpay.lovable.app/",
      },
      {
        property: "og:image",
        content: "https://coindeccpay.lovable.app/og-image.jpg",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "CoindeccPay — Instant USDC Payment Gateway & Split Routing",
      },
      {
        name: "twitter:description",
        content:
          "Deploy embeddable USDC checkout links and automated split-routing on Arc Network.",
      },
      {
        name: "twitter:image",
        content: "https://coindeccpay.lovable.app/og-image.jpg",
      },
    ],
    links: [
      { rel: "canonical", href: "https://coindeccpay.lovable.app/" },
    ],
  }),
  component: Home,
});

function LoadingShell() {
  return (
    <div className="app-gradient flex min-h-screen w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="pulse-dot size-2.5 rounded-full bg-primary" />
        <p className="font-display text-lg font-bold text-foreground">CoindeccPay</p>
        <p className="text-xs text-muted-foreground">Loading your dashboard…</p>
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
