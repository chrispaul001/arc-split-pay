import { useEffect, useState } from "react";
import { useBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, LifeBuoy, Link2, Mail, Plus, Trash2 } from "lucide-react";
import { GuestBanner, GuestEmpty, useWalletGate } from "@/components/guest-gate";
import { randomId, timeAgo, useMerchantStore } from "@/lib/merchant-store";

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
  const { data, update, notify } = useMerchantStore();

  if (!connected)
    return <GuestEmpty description="Connect your wallet to view and manage payment links on Arc." />;

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
            title="No payment links created yet"
            hint="Publish a link from the Split-Router builder and it will appear here for this wallet."
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
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-display text-sm font-bold tabular-nums">
                  {l.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/50 py-1 pr-2.5 pl-1.5">
                  <Switch
                    checked={l.status === "Active"}
                    aria-label={`Toggle ${l.name} status`}
                    onCheckedChange={(on) =>
                      update((p) => ({
                        ...p,
                        links: p.links.map((x) =>
                          x.id === l.id ? { ...x, status: on ? "Active" : "Paused" } : x,
                        ),
                      }))
                    }
                  />
                  <span className={`text-[11px] font-semibold ${l.status === "Active" ? "text-mint" : "text-muted-foreground"}`}>
                    {l.status}
                  </span>
                </label>
                <button
                  aria-label="Copy link"
                  onClick={() => {
                    navigator.clipboard?.writeText(l.url);
                    toast.success("Link copied");
                  }}
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
    return <GuestEmpty description="Connect your wallet to generate and manage API keys." />;

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
            title="No API keys generated yet"
            hint="Generate a key to authenticate server-side calls for this merchant wallet."
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
                  <button
                    aria-label={`Revoke ${k.label}`}
                    onClick={() =>
                      update((p) => ({ ...p, apiKeys: p.apiKeys.filter((x) => x.id !== k.id) }))
                    }
                    className="motion-press rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
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
  const { data, ready, update, address } = useMerchantStore();
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [webhook, setWebhook] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [autoSplit, setAutoSplit] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [sandbox, setSandbox] = useState(false);
  const [walletError, setWalletError] = useState("");

  // hydrate from the wallet-scoped profile, falling back to the global brand
  useEffect(() => {
    if (!connected || !ready) return;
    setName(data.businessName || businessName);
    setWallet(data.settlementWallet || settlementWallet);
    setWebhook(data.webhookUrl);
    setCurrency(data.defaultCurrency || "USDC");
    setAutoSplit(data.autoSplit);
    setEmailReceipts(data.emailReceipts);
    setSandbox(data.sandboxMode);
    if (data.businessName) setProfile({ businessName: data.businessName });
  }, [connected, ready, data.businessName, data.settlementWallet, data.webhookUrl,
      data.defaultCurrency, data.autoSplit, data.emailReceipts, data.sandboxMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const save = () => {
    if (!connected) return;
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
      defaultCurrency: currency,
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
          Connected to Arc Testnet · Chain ID: 5042002
        </span>
      </div>
      {!connected && (
        <GuestBanner message="Connect your wallet to edit and save your merchant settings." />
      )}
      <div className={`space-y-5 ${connected ? "" : "pointer-events-none opacity-50"}`}>
        <div className="space-y-2">
          <Label htmlFor="biz">Business name</Label>
          <Input
            id="biz"
            value={connected ? name : ""}
            placeholder="Your business name"
            disabled={!connected}
            onChange={(e) => setName(e.target.value)}
            className="bg-background/40 transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settle">Settlement wallet</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="settle"
              value={connected ? wallet : ""}
              placeholder="0x…"
              disabled={!connected}
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
            value={connected ? webhook : ""}
            placeholder="https://your-server.com/webhooks/coindecc"
            disabled={!connected}
            onChange={(e) => setWebhook(e.target.value)}
            className="bg-background/40 font-mono transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground">
            Receive server-to-server POST notifications for payment events.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Default currency</Label>
          <select
            id="currency"
            value={currency}
            disabled={!connected}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full appearance-none rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {["USDC", "USDT"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Primary currency for settlements.</p>
        </div>
        {toggles.map(([t, d, v, set]) => (
          <div
            key={t}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 w-full min-w-0 rounded-2xl bg-secondary/50 p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t}</p>
              <p className="text-xs break-words text-muted-foreground">{d}</p>
            </div>
            <Switch disabled={!connected} checked={connected ? v : false} onCheckedChange={set} />
          </div>
        ))}
        <Button onClick={save} disabled={!connected}>
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
