import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, BellRing, CheckCheck, CreditCard, Radio, Split, Wallet } from "lucide-react";
import { enablePush, pushEnabled, PUSH_COPY } from "@/lib/push";
import { toast } from "sonner";
import { timeAgo, useMerchantStore, type MerchantNotification } from "@/lib/merchant-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { explorerTx } from "@/lib/web3";
import { PublishedLinkBox } from "@/components/link-share";

const ICONS = {
  payment: CreditCard,
  split: Split,
  stream: Radio,
  system: Wallet,
} as const;

export function NotificationsBell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { data, update } = useMerchantStore();
  const [pushOn, setPushOn] = useState(false);
  useEffect(() => { setPushOn(address ? pushEnabled(address) : false); }, [address]);
  const turnOnPush = async () => {
    if (!address) return;
    const r = await enablePush(address);
    if (r.status === "registered") { setPushOn(true); toast.success("Push alerts on", { description: "You'll be alerted on this device when USDC arrives." }); }
    else toast.error(PUSH_COPY[r.status]);
  };

  const [backdrop, setBackdrop] = useState(false);
  useEffect(() => {
    if (open) { setBackdrop(true); return; }
    const t = window.setTimeout(() => setBackdrop(false), 200);
    return () => window.clearTimeout(t);
  }, [open]);

  const items: MerchantNotification[] = isConnected ? data.notifications : [];
  const unread = items.filter((n) => !n.read).length;
  const selected = items.find((n) => n.id === selectedId);

  const select = (item: MerchantNotification) => {
    update((p) => ({ ...p, notifications: p.notifications.map((n) => n.id === item.id ? { ...n, read: true } : n) }));
    setOpen(false);
    setSelectedId(item.id);
  };

  const markAll = () => {
    update((p) => ({ ...p, notifications: p.notifications.map((n) => ({ ...n, read: true })) }));
    toast.success("All caught up", { description: "Notifications marked as read." });
  };

  return (
    <>
    {backdrop && createPortal(
      <div className="wallet-menu-backdrop" data-state={open ? "open" : "closed"} aria-hidden="true"
        onPointerDown={(e) => { e.preventDefault(); setOpen(false); }} />,
      document.body,
    )}
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          aria-label="Notifications"
          className="motion-press group/bell relative overflow-visible! rounded-xl p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <Bell className="size-5 transition-transform duration-300 group-hover/bell:-rotate-12" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background" aria-label={`${unread} unread notifications`}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        aria-label="Notifications"
        className="wallet-menu-surface w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-1.5"
      >
        <div className="wallet-menu-handle" aria-hidden="true"><span /></div>
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {items.length > 0 && (
            <Button variant="ghost" size="sm"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        {isConnected && address && (
          <Button variant="ghost" size="sm" disabled={pushOn} onClick={() => void turnOnPush()}
            className="mx-1 mb-1 flex h-auto w-[calc(100%-0.5rem)] justify-start gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-primary">
            <BellRing className="size-3.5" /> {pushOn ? "Push alerts on for this device" : "Turn on push alerts"}
          </Button>
        )}
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
                <Button key={a.id} variant="ghost" onClick={() => select(a)} className="flex h-auto w-full items-start justify-start gap-3 rounded-md px-2 py-2.5 text-left whitespace-normal hover:bg-secondary/60">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{a.title}</span>
                    <span className="block text-[11px] break-words text-muted-foreground">{a.body}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                      {timeAgo(a.createdAt)}
                    </span>
                  </span>
                  {!a.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </Button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={selectedId !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelectedId(null); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-md">
        <DialogHeader>
          <DialogTitle>{selected?.title ?? "Notification"}</DialogTitle>
          <DialogDescription>{selected?.body}</DialogDescription>
        </DialogHeader>
        {selected && <div className="space-y-3 text-sm">
           <div><p className="text-xs text-muted-foreground">{selected.payment ? "Timestamp" : "Received"}</p><p>{new Date(selected.createdAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" })}</p></div>
          {selected.linkUrl && <div><p className="text-xs text-muted-foreground">Payment link</p><div className="mt-1"><PublishedLinkBox url={selected.linkUrl} /></div></div>}
          {selected.payment && <>
            <div><p className="text-xs text-muted-foreground">Sender</p><p className="break-all font-mono text-xs">{selected.payment.sender}</p></div>
             <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold tabular-nums">{selected.payment.amount.toLocaleString()} {selected.payment.currency}</p></div>
             <div><p className="text-xs text-muted-foreground">Explorer hash</p><a className="break-all font-mono text-xs text-primary underline" href={explorerTx(selected.payment.hash)} target="_blank" rel="noopener noreferrer">{selected.payment.hash}</a></div>
             {selected.payment.splits?.length > 0 && <div><p className="text-xs text-muted-foreground">Recipient transfers</p>
               <ul className="mt-1 divide-y divide-border">{selected.payment.splits.map((s, i) => <li key={`${s.address}-${i}`} className="py-2"><span className="block break-all font-mono text-xs">{s.address}</span><span className="font-semibold tabular-nums">{s.amount.toLocaleString()} USDC</span></li>)}</ul>
             </div>}
          </>}
        </div>}
      </DialogContent>
    </Dialog>
    </>
  );
}
