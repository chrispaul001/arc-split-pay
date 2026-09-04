import { useState } from "react";
import { useAccount } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, CreditCard, Radio, Split, Wallet } from "lucide-react";
import { toast } from "sonner";

const GUEST_ALERTS = [
  { icon: Wallet, title: "Connect your wallet", body: "Link an Arc wallet to start receiving USDC payments.", time: "now" },
  { icon: CreditCard, title: "Create your first payment link", body: "Share a link and get paid in seconds.", time: "tip" },
];

const MERCHANT_ALERTS = [
  { icon: CreditCard, title: "Payment received", body: "+250.00 USDC · split executed to 2 recipients.", time: "2m ago" },
  { icon: Split, title: "Split router settled", body: "Checkout #1042 routed 92/8 across your wallets.", time: "18m ago" },
  { icon: Radio, title: "Stream milestone", body: "Contractor stream crossed 1,000 USDC streamed.", time: "1h ago" },
];

export function NotificationsBell() {
  const { isConnected } = useAccount();
  const [read, setRead] = useState(false);
  const alerts = isConnected ? MERCHANT_ALERTS : GUEST_ALERTS;

  return (
    <DropdownMenu onOpenChange={(open) => open && setRead(true)}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="motion-press group/bell relative rounded-xl p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <Bell className="size-5 transition-transform duration-300 group-hover/bell:-rotate-12" />
          {!read && <span className="pulse-dot absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="glass w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-border p-1.5">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            onClick={() => toast.success("All caught up", { description: "Notifications marked as read." })}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-72 space-y-1 overflow-y-auto p-1">
          {alerts.map((a) => (
            <div key={a.title} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-secondary/60">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <a.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{a.title}</span>
                <span className="block text-[11px] break-words text-muted-foreground">{a.body}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground/70">{a.time}</span>
              </span>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
