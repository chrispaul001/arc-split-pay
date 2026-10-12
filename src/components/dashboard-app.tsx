import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  Bell,
  QrCode,
  Workflow,
  Store,
  Waves,
  Layers,
  ArrowLeftRight,
  SlidersHorizontal,
  Terminal,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Mail,
  Menu,
  Moon,
  Plus,
  Radio,
  Settings,
  Split,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Overview } from "@/components/overview";
import { SplitRouter } from "@/components/split-router";
import { Transactions } from "@/components/transactions";
import { History } from "lucide-react";
import { Streams } from "@/components/streams";
import { CheckoutPreview } from "@/components/checkout-preview";
import { ApiKeys, PaymentLinks, SettingsView } from "@/components/panels";
import { toast } from "sonner";
import { ProfileMenu } from "@/components/profile-menu";
import { BrandProvider } from "@/lib/brand";
import { MerchantProvider } from "@/lib/merchant-store";
import { Web3Provider } from "@/components/web3-provider";
import { OnchainCheckout } from "@/components/onchain-checkout";
import { ConnectWallet } from "@/components/connect-wallet";
import { NotificationsBell } from "@/components/notifications-bell";
import { Reveal } from "@/components/reveal";
import logoTile from "@/assets/coindecc-tile.png.asset.json";

const NAV = [
  { key: "overview", label: "Overview", icon: Layers },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "links", label: "Payment Links", icon: QrCode },
  { key: "split", label: "Split Router", icon: Workflow },
  { key: "checkout", label: "Checkout", icon: Store },
  { key: "streams", label: "Streams", icon: Waves },
  { key: "keys", label: "API Keys", icon: Terminal },
  { key: "settings", label: "Settings", icon: SlidersHorizontal },
] as const;

type ViewKey = (typeof NAV)[number]["key"];

export default function DashboardApp() {
  return (
    <Web3Provider>
      <BrandProvider>
        <MerchantProvider>
          <DashboardShell />
        </MerchantProvider>
      </BrandProvider>
    </Web3Provider>
  );
}

function DashboardShell() {
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<ViewKey>("overview");
  const [navOpen, setNavOpen] = useState(false);

  const current = NAV.find((n) => n.key === view)!;

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item, i) => {
        const active = item.key === view;
        return (
          <button
            key={item.key}
            onClick={() => {
              setView(item.key);
              setNavOpen(false);
            }}
            style={{ animationDelay: `${i * 45}ms` }}
            className={`motion-press animate-rise group/nav flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium ${
              active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--glass-border)]"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <item.icon className="size-4 shrink-0 transition-transform duration-300 group-hover/nav:scale-110 group-hover/nav:-rotate-6" />
            <span className="truncate">{item.label}</span>
            {active && <span className="pulse-dot ml-auto size-1.5 shrink-0 rounded-full bg-primary" />}
          </button>
        );
      })}
    </nav>
  );

  const themeToggle = (
    <button
      onClick={toggle}
      className="motion-press flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-3 py-2.5 text-sm font-medium hover:bg-secondary/80"
      aria-label="Toggle color mode"
    >
      {theme === "dark" ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-primary" />}
      <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
      <span className="ml-auto flex h-5 w-9 shrink-0 items-center rounded-full bg-background/60 p-0.5">
        <span
          className={`size-4 rounded-full bg-primary transition-transform duration-300 ${
            theme === "dark" ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="app-gradient flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
      <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-1 gap-6 overflow-x-clip px-4 py-4 sm:px-6 sm:py-6">

        {/* Sidebar — desktop */}
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl p-4 lg:flex">
          <Brand />
          <div className="mt-6 flex-1">{nav}</div>
          <SidebarFooter />
          {themeToggle}
        </aside>

        {/* Sidebar — mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="animate-in fade-in absolute inset-0 bg-background/60 backdrop-blur-sm duration-200" onClick={() => setNavOpen(false)} />
            <aside className="glass animate-rise absolute top-4 bottom-4 left-4 flex w-64 flex-col rounded-3xl p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Brand />
                <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="shrink-0 p-1.5">
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-6 flex-1">{nav}</div>
              <SidebarFooter />
              {themeToggle}
            </aside>
          </div>
        )}

        <main className="min-w-0 w-full flex-1 space-y-6">
          <header className="glass relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-visible rounded-3xl py-3 pl-4 pr-5 sm:gap-3 sm:py-4 sm:pl-6 sm:pr-7">

            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setNavOpen(true)}
                className="motion-press shrink-0 rounded-xl p-2 hover:bg-secondary/60 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">{current.label}</h1>
                <span className="mt-0.5 hidden items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted-foreground sm:inline-flex 2xl:hidden">
                  <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" />
                  Arc Mainnet · USDC Gas
                </span>
              </div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
              <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold 2xl:inline-flex">
                <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" />
                Arc Mainnet — USDC Gas
              </span>
              <div className="hidden lg:block">
                <ConnectWallet compact />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="hidden md:inline-flex"
                onClick={() => setView("split")}
              >
                <Plus className="size-4" /> New link
              </Button>
              <NotificationsBell />
              <ProfileMenu onOpenSettings={() => setView("settings")} />
            </div>


          </header>

           <div key={view} className="animate-rise w-full min-w-0 max-w-[100vw] overflow-x-clip">
          <ErrorBoundary resetKey={view}>
          {view === "overview" && (
            <div className="space-y-6">
              <Overview />
            </div>
          )}
          {view === "checkout" && (
            <div className="space-y-6">
              <Reveal>
                <OnchainCheckout />
              </Reveal>
              <Reveal delay={80}>
                <CheckoutPreview />
              </Reveal>
            </div>
          )}
          {view === "links" && <PaymentLinks onNewLink={() => setView("split")} />}
          {view === "split" && <SplitRouter />}
          {view === "transactions" && <Transactions />}
          {view === "streams" && <Streams />}
          {view === "keys" && <ApiKeys />}
          {view === "settings" && <SettingsView />}
          </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SidebarFooter() {
  const link =
    "motion-press flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground";
  return (
    <div className="mt-3 w-full min-w-0 space-y-0.5 border-t border-border pt-3">
      <a
        href="https://x.com/coindecc"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
        aria-label="Coindecc on X (Twitter)"
      >
        <XLogo className="size-3.5 shrink-0" />
        <span className="truncate">@coindecc</span>
      </a>
      <a
        href="mailto:coindeccpay@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
        aria-label="Email CoindeccPay support"
      >
        <Mail className="size-3.5 shrink-0" />
        <span className="min-w-0 break-all">coindeccpay@gmail.com</span>
      </a>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={logoTile.url}
        alt="CoindeccPay logo"
        width={40}
        height={40}
        className="size-10 shrink-0 self-center rounded-[22%] shadow-md ring-1 ring-border"
      />




      <span className="min-w-0">
        <span className="block truncate font-display text-base font-bold">CoindeccPay</span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">
          Accept, Split & Stream USDC
        </span>
      </span>
    </div>
  );
}
