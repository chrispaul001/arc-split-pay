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
import { timeAgo, useMerchantStore, type MerchantNotification } from "@/lib/merchant-store";

const ICONS = {
  payment: CreditCard,
  split: Split,
  stream: Radio,
  system: Wallet,
} as const;

export function NotificationsBell() {
  const { isConnected } = useAccount();
  const { data, update } = useMerchantStore();

  const items: MerchantNotification[] = isConnected ? data.notifications : [];
  const unread = items.filter((n) => !n.read).length;

  const markAll = () => {
    update((p) => ({ ...p, notifications: p.notifications.map((n) => ({ ...n, read: true })) }));
    toast.success("All caught up", { description: "Notifications marked as read." });
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread > 0)
          update((p) => ({ ...p, notifications: p.notifications.map((n) => ({ ...n, read: true })) }));
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="motion-press group/bell relative rounded-xl p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <Bell className="size-5 transition-transform duration-300 group-hover/bell:-rotate-12" />
          {unread > 0 && (
            <span className="pulse-dot absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="glass w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-border p-1.5"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {items.length > 0 && (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-72 space-y-1 overflow-y-auto p-1">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {isConnected
                ? "No recent notifications"
                : "Connect your wallet to receive live payment alerts."}
            </p>
          ) : (
            items.map((a) => {
              const Icon = ICONS[a.kind] ?? Wallet;
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-secondary/60">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{a.title}</span>
                    <span className="block text-[11px] break-words text-muted-foreground">{a.body}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                      {timeAgo(a.createdAt)}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
