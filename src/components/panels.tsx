import { withLinkParams } from "@/lib/link-status.functions";
import { useEffect, useState } from "react";
import { useBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff, KeyRound, LifeBuoy, Link2, Mail, Plus, Trash2 } from "lucide-react";
import { GuestBanner, GuestEmpty, useSaveGate, useWalletGate } from "@/components/guest-gate";
import { copyPaymentLink } from "@/components/link-share";
import { PushAlertsToggle } from "@/components/push-alerts-toggle";
import { randomId, timeAgo, useMerchantStore } from "@/lib/merchant-store";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function EmptyCard({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs break-words text-muted-foreground">{hint}</p>
      {action}
    </div>
  );
}

export function PaymentLinks({ onNewLink }: { onNewLink?: () => void }) {
  const connected = useWalletGate();
  const { data, update, notify, address } = useMerchantStore();

  if (!connected)
    return <GuestEmpty description="Connect your wallet to manage payment links." />;

  const links = data.links;

  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-lg font-semibold">Payment links</h3>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => onNewLink?.()}
        >
          <Plus className="size-4" /> New link
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="mt-5">
          <EmptyCard
            title="No payment links yet."
            hint="Create a link in the Split-Router to see it here."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {links.map((l) => (
            <li
              key={l.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 w-full min-w-0 rounded-2xl bg-secondary/50 p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary/70"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{l.name}</p>
                <p className="truncate font-mono text-[11px] break-words text-muted-foreground">
                  <Link2 className="mr-1 inline size-3" />
                  {l.reference || l.id} · {l.parties.length} parties · {timeAgo(l.createdAt)}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80" title={l.url}>
                  {l.url}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-display text-sm font-bold tabular-nums">
                  {l.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/50 py-1 pr-2.5 pl-1.5">
                  <Switch
                    checked={l.status === "Active"}
                    aria-label={`Toggle ${l.name} status`}
                    onCheckedChange={(on) => {
                      update((p) => ({ ...p, links: p.links.map((x) => (x.id === l.id ? { ...x, status: on ? "Active" : "Paused" } : x)) }));
                      toast.success(on ? "Link activated" : "Link paused", { description: on ? `${l.name} can accept payments again.` : `Buyers opening ${l.name} will see it is inactive.` });
                    }}
                  />
                  <span className={`text-[11px] font-semibold ${l.status === "Active" ? "text-mint" : "text-muted-foreground"}`}>
                    {l.status === "Active" ? "Active" : "Inactive"}
                  </span>
                </label>
                <button
                  aria-label="Copy link"
                  onClick={() => copyPaymentLink(address ? withLinkParams(l.url, l.id, address) : l.url)}
                  className="motion-press rounded-lg p-1.5 text-muted-foreground hover:bg-primary/12 hover:text-primary"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  aria-label={`Delete ${l.name}`}
                  onClick={() => {
                    update((p) => ({ ...p, links: p.links.filter((x) => x.id !== l.id) }));
                    notify({ kind: "system", title: "Payment link removed", body: l.name });
                  }}
                  className="motion-press rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApiKeys() {
  const connected = useWalletGate();
  const [shown, setShown] = useState(false);
  const { data, update, notify, address } = useMerchantStore();

  if (!connected)
    return <GuestEmpty description="Connect your wallet to manage API keys." />;

  const keys = data.apiKeys;

  const generate = () => {
    const live = keys.length === 0;
    const seed = randomId() + randomId();
    const key = {
      id: randomId(),
      label: live ? "Production" : `Key ${keys.length + 1}`,
      value: `${live ? "sk_live" : "sk_test"}_arc_${seed.slice(0, 24)}`,
      createdAt: Date.now(),
    };
    update((p) => ({ ...p, apiKeys: [key, ...p.apiKeys] }));
    notify({
      kind: "system",
      title: "API key generated",
      body: `${key.label} key created for ${address?.slice(0, 6)}…`,
    });
    setShown(true);
    toast.success("API key generated", { description: "Copy it now — it is stored to this wallet." });
  };

  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-lg font-semibold">API keys</h3>
        <div className="flex shrink-0 gap-2">
          {keys.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShown((s) => !s)}>
              {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {shown ? "Hide" : "Reveal"}
            </Button>
          )}
          <Button size="sm" onClick={generate}>
            <Plus className="size-4" /> Generate key
          </Button>
        </div>
      </div>

      {keys.length === 0 ? (
        <div className="mt-5">
          <EmptyCard
            title="No API keys yet."
            hint="Generate a key to authenticate server-side requests."
            action={
              <Button size="sm" className="motion-press" onClick={generate}>
                <KeyRound className="size-4" /> Generate key
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {keys.map((k) => (
            <li key={k.id} className="w-full min-w-0 rounded-2xl bg-secondary/50 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="flex min-w-0 items-center gap-2 font-medium">
                  <KeyRound className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{k.label}</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] break-words text-muted-foreground">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        aria-label={`Revoke ${k.label}`}
                        className="motion-press rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke {k.label} key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Any server or integration using the key ending in ... {k.value.slice(-4)} will stop working immediately. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            update((p) => ({ ...p, apiKeys: p.apiKeys.filter((x) => x.id !== k.id) }));
                            notify({
                              kind: "system",
                              title: "API key revoked",
                              body: `${k.label} key (…${k.value.slice(-4)}) revoked for ${address?.slice(0, 6)}…`,
                            });
                            toast.success("API key revoked", { description: `${k.label} key can no longer be used.` });
                          }}
                        >
                          Revoke key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="mt-2 truncate font-mono text-xs">
                {shown ? k.value : "•".repeat(k.value.length)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function SettingsView() {
  const connected = useWalletGate();
  const { businessName, settlementWallet, setProfile } = useBrand();
  const { data, ready, update, address, ensureSession } = useMerchantStore();
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [webhook, setWebhook] = useState("");
  const [autoSplit, setAutoSplit] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [sandbox, setSandbox] = useState(false);
  const [walletError, setWalletError] = useState("");
  const canSave = useSaveGate();

  // hydrate from the wallet-scoped profile, falling back to the global brand
  useEffect(() => {
    if (!connected || !ready) return;
    setName(data.businessName || businessName);
    setWallet(data.settlementWallet || settlementWallet);
    setWebhook(data.webhookUrl);
    setAutoSplit(data.autoSplit);
    setEmailReceipts(data.emailReceipts);
    setSandbox(data.sandboxMode);
    if (data.businessName) setProfile({ businessName: data.businessName });
  }, [connected, ready, data.businessName, data.settlementWallet, data.webhookUrl,
      data.autoSplit, data.emailReceipts, data.sandboxMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const useConnectedWallet = () => {
    if (!address) return;
    setWallet(address);
    setWalletError("");
    toast.success("Settlement wallet set to connected wallet");
  };

  const onWalletChange = (v: string) => {
    setWallet(v);
    const t = v.trim();
    setWalletError(t && !ETH_ADDRESS_RE.test(t) ? "Enter a valid 0x address (42 characters)." : "");
  };

  const save = async () => {
    if (!canSave()) return;
    if (!(await ensureSession())) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Business name can't be empty");
      return;
    }
    const w = wallet.trim();
    if (w && !ETH_ADDRESS_RE.test(w)) {
      setWalletError("Enter a valid 0x address (42 characters).");
      toast.error("Invalid settlement wallet address");
      return;
    }
    const wh = webhook.trim();
    if (wh && !/^https?:\/\/.+/i.test(wh)) {
      toast.error("Webhook URL must start with http:// or https://");
      return;
    }
    setProfile({ businessName: trimmed, settlementWallet: w });
    update((p) => ({
      ...p,
      businessName: trimmed,
      settlementWallet: w,
      webhookUrl: wh,
      defaultCurrency: "USDC",
      autoSplit,
      emailReceipts,
      sandboxMode: sandbox,
    }));
    toast.success("Settings saved", { description: `Business name updated to ${trimmed}.` });
  };

  const toggles: [string, string, boolean, (v: boolean) => void][] = [
    ["Auto-split on receipt", "Execute the router the moment funds land.", autoSplit, setAutoSplit],
    ["Email receipts", "Send a branded receipt to every payer.", emailReceipts, setEmailReceipts],
    ["Sandbox mode", "Route all traffic to the Arc testnet.", sandbox, setSandbox],
  ];

  return (
    <div className="glass animate-rise w-full max-w-2xl space-y-5 rounded-3xl px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Settings</h3>
        <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-[11px] font-semibold text-mint">
          <span className="pulse-dot size-1.5 rounded-full bg-mint" />
          Connected to Arc · Chain ID: 5042002
        </span>
      </div>
      {!connected && (
        <GuestBanner message="Guest preview — explore freely. Connect your wallet to save changes." />
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="biz">Business name</Label>
          <Input
            id="biz"
            value={name}
            placeholder="Your business name"
            onChange={(e) => setName(e.target.value)}
            className="bg-background/40 transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settle">Settlement wallet</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="settle"
              value={wallet}
              placeholder="0x…"
              onChange={(e) => onWalletChange(e.target.value)}
              className={`bg-background/40 font-mono transition-all focus-visible:ring-2 focus-visible:ring-primary/50 ${walletError ? "border-destructive" : ""}`}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!connected || !address}
              onClick={useConnectedWallet}
              className="shrink-0"
            >
              <Link2 className="size-4" /> Use connected wallet
            </Button>
          </div>
          {walletError ? (
            <p className="text-xs text-destructive">{walletError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Where settled funds are sent. Must be a valid Ethereum-compatible address.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook">Webhook URL</Label>
          <Input
            id="webhook"
            type="url"
            value={webhook}
            placeholder="https://your-server.com/webhooks/coindecc"
            onChange={(e) => setWebhook(e.target.value)}
            className="bg-background/40 font-mono transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground">
            Receive server-to-server POST notifications for payment events.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Default currency</Label>
          <div
            id="currency"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-[10px] font-bold text-primary">
                $
              </span>
              <span className="truncate font-medium">USDC</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-mint uppercase">
              <span className="pulse-dot size-1.5 rounded-full bg-mint" />
              Arc Native
            </span>
          </div>
          <p className="text-xs break-words text-muted-foreground">
            CoindeccPay operates as a USDC-native gateway on Arc Network for optimized gas and instant settlement.
          </p>
        </div>
        <PushAlertsToggle address={connected ? address : null} />
        {toggles.map(([t, d, v, set]) => (
          <div
            key={t}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 w-full min-w-0 rounded-2xl bg-secondary/50 p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t}</p>
              <p className="text-xs break-words text-muted-foreground">{d}</p>
            </div>
            <Switch checked={v} onCheckedChange={set} />
          </div>
        ))}
        <Button onClick={save}>
          Save changes
        </Button>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-border bg-secondary/40 p-4">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <LifeBuoy className="size-4 shrink-0 text-primary" />
          <span className="truncate">Support &amp; Community</span>
        </p>
        <p className="mt-1 text-xs break-words text-muted-foreground">
          Questions, integrations or feedback? Reach us on X or by email — we usually reply within a day.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href="https://x.com/coindecc"
            target="_blank"
            rel="noopener noreferrer"
            className="motion-press inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/60"
          >
            <XLogo className="size-3 shrink-0" />
            <span className="truncate">@coindecc</span>
          </a>
          <a
            href="mailto:coindeccpay@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="motion-press inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/60"
          >
            <Mail className="size-3 shrink-0 text-primary" />
            <span className="min-w-0 break-all">coindeccpay@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  );
}
