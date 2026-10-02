import { useEffect, useState } from "react";
import { BellRing, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { disablePush, enablePush, pushState, PUSH_COPY, type PushState } from "@/lib/push";

const BADGE: Record<PushState, { label: string; cls: string; hint: string }> = {
  active: { label: "Notifications Active", cls: "border-mint/30 bg-mint/10 text-mint", hint: "This device gets an alert the moment USDC reaches your wallet." },
  blocked: { label: "Permission Blocked", cls: "border-destructive/30 bg-destructive/10 text-destructive", hint: "Your browser is blocking notifications. Tap the lock icon next to the address bar, set Notifications to Allow, then turn this on again." },
  off: { label: "Enable Alerts", cls: "border-border bg-background/50 text-muted-foreground", hint: "Get an alert on this device for every incoming payment, even when CoindeccPay is in the background." },
  unsupported: { label: "Not Supported", cls: "border-border bg-background/50 text-muted-foreground", hint: "This browser can't show push alerts. On iPhone, add CoindeccPay to your Home Screen first." },
};

export function PushAlertsToggle({ address }: { address: string | null | undefined }) {
  const [state, setState] = useState<PushState>("off");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (address) setState(pushState(address)); }, [address]);

  const toggle = async (on: boolean) => {
    if (!address) { toast.error("Connect your wallet to turn on alerts."); return; }
    setBusy(true);
    try {
      if (on) {
        const r = await enablePush(address);
        if (r.status === "registered") toast.success("Live payment alerts on", { description: "You'll be alerted on this device when USDC arrives." });
        else toast.error(PUSH_COPY[r.status]);
      } else {
        await disablePush(address);
        toast.success("Live payment alerts off", { description: "This device won't receive push alerts." });
      }
    } finally {
      setState(pushState(address));
      setBusy(false);
    }
  };

  const b = BADGE[state];
  return (
    <div className="w-full min-w-0 rounded-2xl bg-secondary/50 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium"><BellRing className="size-4 shrink-0 text-primary" /> <span className="truncate">Live Payment Alerts</span></p>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${b.cls}`} title={b.hint}>
            {state === "active" && <span className="pulse-dot size-1.5 rounded-full bg-mint" />}
            {b.label}
          </span>
        </div>
        {busy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : (
          <Switch checked={state === "active"} disabled={state === "unsupported" || !address} onCheckedChange={(v) => void toggle(v)} aria-label="Live payment alerts" />
        )}
      </div>
      <p className="mt-2 flex gap-1.5 text-xs break-words text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{b.hint}</p>
    </div>
  );
}
