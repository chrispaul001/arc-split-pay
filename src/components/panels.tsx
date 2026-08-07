import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, Link2, Plus } from "lucide-react";

const links = [
  { name: "Studio retainer", amount: "5,000.00", parties: 4, status: "Active", url: "pay.coindecc.xyz/l/rt-4421" },
  { name: "Hardware bundle", amount: "89.99", parties: 2, status: "Active", url: "pay.coindecc.xyz/l/hw-0912" },
  { name: "Course access", amount: "249.00", parties: 3, status: "Paused", url: "pay.coindecc.xyz/l/cs-7730" },
];

export function PaymentLinks() {
  return (
    <div className="glass animate-rise rounded-3xl px-4 py-5 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-lg font-semibold">Payment links</h3>
        <Button size="sm" className="shrink-0" onClick={() => toast.success("New link draft created")}>
          <Plus className="size-4" /> New link
        </Button>
      </div>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li
            key={l.url}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary/70"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{l.name}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                <Link2 className="mr-1 inline size-3" />
                {l.url} · {l.parties} parties
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-display text-sm font-bold tabular-nums">{l.amount}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  l.status === "Active" ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground"
                }`}
              >
                {l.status}
              </span>
              <button
                aria-label="Copy link"
                onClick={() => {
                  navigator.clipboard?.writeText(`https://${l.url}`);
                  toast.success("Link copied");
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ApiKeys() {
  const [shown, setShown] = useState(false);
  const keys = [
    { label: "Production", value: "sk_live_arc_9f21c47ba0e8d3", created: "Mar 12, 2026" },
    { label: "Sandbox", value: "sk_test_arc_4b70e19da55c22", created: "Jan 04, 2026" },
  ];
  return (
    <div className="glass animate-rise rounded-3xl px-4 py-5 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-lg font-semibold">API keys</h3>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setShown((s) => !s)}>
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {shown ? "Hide" : "Reveal"}
        </Button>
      </div>
      <ul className="mt-5 space-y-3">
        {keys.map((k) => (
          <li key={k.label} className="rounded-2xl bg-secondary/50 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="flex min-w-0 items-center gap-2 font-medium">
                <KeyRound className="size-4 shrink-0 text-primary" />
                <span className="truncate">{k.label}</span>
              </p>
              <span className="shrink-0 text-[11px] text-muted-foreground">{k.created}</span>
            </div>
            <p className="mt-2 truncate font-mono text-xs">
              {shown ? k.value : "•".repeat(k.value.length)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="glass animate-rise max-w-2xl space-y-5 rounded-3xl px-4 py-5 sm:px-6">
      <h3 className="text-lg font-semibold">Settings</h3>
      <div className="space-y-2">
        <Label htmlFor="biz">Business name</Label>
        <Input id="biz" defaultValue="Nova Studio" className="bg-background/40" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="settle">Settlement wallet</Label>
        <Input id="settle" defaultValue="0x8fA2…4c19" className="bg-background/40 font-mono" />
      </div>
      {[
        ["Auto-split on receipt", "Execute the router the moment funds land."],
        ["Email receipts", "Send a branded receipt to every payer."],
        ["Sandbox mode", "Route all traffic to the Arc testnet."],
      ].map(([t, d], i) => (
        <div key={t} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl bg-secondary/50 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{t}</p>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
          <Switch defaultChecked={i < 2} />
        </div>
      ))}
      <Button onClick={() => toast.success("Settings saved")}>Save changes</Button>
    </div>
  );
}
