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
import { Bell, Building2, CheckCircle2, Code2, Copy, ExternalLink, Eye, EyeOff, Globe, KeyRound, LifeBuoy, Link2, Loader2, Mail, Plus, Trash2 } from "lucide-react";
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

const SETTINGS_SECTIONS = [
  { id: "profile", label: "Business profile", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "developers", label: "Developers", icon: Code2 },
  { id: "support", label: "Help & support", icon: LifeBuoy },
] as const;

function SettingsSection({
  id, title, description, icon: Icon, children,
}: { id: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section id={`settings-${id}`} className="glass animate-rise scroll-mt-24 rounded-3xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-xs break-words text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SwitchRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-xs break-words text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

export function SettingsView() {
  const connected = useWalletGate();
  const { businessName, settlementWallet, setProfile } = useBrand();
  const { data, ready, update, address, ensureSession } = useMerchantStore();
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [webhook, setWebhook] = useState("");
  const [walletError, setWalletError] = useState("");
  const [webhookError, setWebhookError] = useState("");
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState({ name: "", wallet: "", webhook: "" });
  const canSave = useSaveGate();

  useEffect(() => {
    if (!connected || !ready) return;
    const b = {
      name: data.businessName || businessName,
      wallet: data.settlementWallet || settlementWallet,
      webhook: data.webhookUrl,
    };
    setBaseline(b);
    setName(b.name); setWallet(b.wallet); setWebhook(b.webhook);
    if (data.businessName) setProfile({ businessName: data.businessName });
  }, [connected, ready, data.businessName, data.settlementWallet, data.webhookUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    name !== baseline.name || wallet !== baseline.wallet || webhook !== baseline.webhook;

  const walletValid = ETH_ADDRESS_RE.test(wallet.trim());

  const discard = () => {
    setName(baseline.name); setWallet(baseline.wallet); setWebhook(baseline.webhook);
    setWalletError(""); setWebhookError("");
  };

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

  const onWebhookChange = (v: string) => {
    setWebhook(v);
    const t = v.trim();
    setWebhookError(t && !/^https?:\/\/.+/i.test(t) ? "URL must start with http:// or https://" : "");
  };

  const copy = async (v: string, label: string) => {
    if (!v) return;
    try { await navigator.clipboard.writeText(v); toast.success(`${label} copied`); }
    catch { toast.error("Couldn't copy"); }
  };

  const save = async () => {
    if (!canSave()) return;
    setSaving(true);
    try {
      if (!(await ensureSession())) return;
      const trimmed = name.trim();
      if (!trimmed) { toast.error("Business name can't be empty"); return; }
      const w = wallet.trim();
      if (w && !ETH_ADDRESS_RE.test(w)) {
        setWalletError("Enter a valid 0x address (42 characters).");
        toast.error("Invalid settlement wallet address");
        return;
      }
      const wh = webhook.trim();
      if (wh && !/^https?:\/\/.+/i.test(wh)) {
        setWebhookError("URL must start with http:// or https://");
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
      }));
      setBaseline({ name: trimmed, wallet: w, webhook: wh });
      setName(trimmed); setWallet(w); setWebhook(wh);
      toast.success("Settings saved", { description: `Business name updated to ${trimmed}.` });
    } finally {
      setSaving(false);
    }
  };

  const jump = (id: string) =>
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const inputCls = "bg-background/40 transition-all focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <div className="w-full max-w-5xl pb-28">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Manage your business profile, payouts and integrations.</p>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-[11px] font-semibold text-mint">
            <span className="pulse-dot size-1.5 rounded-full bg-mint" />
            Connected · Arc Testnet
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Wallet not connected
          </span>
        )}
      </div>

      {!connected && (
        <div className="mb-5">
          <GuestBanner message="Guest preview — explore freely. Connect your wallet to save changes." />
        </div>
      )}

      <nav aria-label="Settings sections" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:hidden">
        {SETTINGS_SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => jump(s.id)}
            className="motion-press shrink-0 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:bg-secondary/60">
            {s.label}
          </button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {SETTINGS_SECTIONS.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => jump(s.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
                  <s.icon className="size-4" /> {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <SettingsSection id="profile" title="Business profile" description="How your business appears to payers, and where funds settle." icon={Building2}>
            <div className="space-y-2">
              <Label htmlFor="biz">Business name</Label>
              <Input id="biz" value={name} placeholder="Your business name" onChange={(e) => setName(e.target.value)} className={inputCls} />
              <p className="text-xs text-muted-foreground">Shown on checkout pages and receipts.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle">Settlement wallet</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Input id="settle" value={wallet} placeholder="0x…" onChange={(e) => onWalletChange(e.target.value)}
                    aria-invalid={!!walletError}
                    className={`${inputCls} pr-20 font-mono ${walletError ? "border-destructive" : ""}`} />
                  <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                    {walletValid && <CheckCircle2 className="size-4 text-mint" aria-label="Valid address" />}
                    <button type="button" onClick={() => copy(wallet.trim(), "Wallet address")} disabled={!wallet}
                      aria-label="Copy wallet address"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:opacity-40">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
                <Button type="button" variant="secondary" disabled={!connected || !address} onClick={useConnectedWallet} className="shrink-0">
                  <Link2 className="size-4" /> Use connected wallet
                </Button>
              </div>
              {walletError ? (
                <p className="text-xs text-destructive">{walletError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Where settled funds are sent. Must be a valid Ethereum-compatible address.</p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection id="notifications" title="Notifications" description="Stay on top of every payment." icon={Bell}>
            <PushAlertsToggle address={connected ? address : null} />
          </SettingsSection>

          <SettingsSection id="developers" title="Developers" description="Server-to-server notifications for payment events." icon={Code2}>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <div className="relative">
                <Input id="webhook" type="url" value={webhook} placeholder="https://your-server.com/webhooks/coindecc"
                  onChange={(e) => onWebhookChange(e.target.value)} aria-invalid={!!webhookError}
                  className={`${inputCls} pr-11 font-mono ${webhookError ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => copy(webhook.trim(), "Webhook URL")} disabled={!webhook}
                  aria-label="Copy webhook URL"
                  className="absolute inset-y-0 right-1 my-auto grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:opacity-40">
                  <Copy className="size-3.5" />
                </button>
              </div>
              {webhookError ? (
                <p className="text-xs text-destructive">{webhookError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">We'll POST a JSON event to this URL when a payment settles.</p>
              )}
            </div>
          </SettingsSection>


          <SettingsSection id="support" title="Help & support" description="Questions, integrations or feedback? We usually reply within a day." icon={LifeBuoy}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <a href="https://x.com/coindecc" target="_blank" rel="noopener noreferrer"
                className="motion-press inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/60">
                <XLogo className="size-3 shrink-0" /><span className="truncate">@coindecc</span>
              </a>
              <a href="mailto:coindeccpay@gmail.com" target="_blank" rel="noopener noreferrer"
                className="motion-press inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/60">
                <Mail className="size-3 shrink-0 text-primary" /><span className="min-w-0 break-all">coindeccpay@gmail.com</span>
              </a>
            </div>
          </SettingsSection>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" role="region" aria-label="Unsaved changes">
          <div className="glass animate-rise flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 shadow-lg">
            <p className="min-w-0 truncate text-sm font-medium">You have unsaved changes</p>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" onClick={discard} disabled={saving}>Discard</Button>
              <Button onClick={save} disabled={saving || !!walletError || !!webhookError}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
