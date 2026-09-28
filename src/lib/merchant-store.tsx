import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

/**
 * Per-wallet persistent merchant state.
 * Everything is scoped to the connected address so a returning merchant
 * instantly loads their own links, streams, keys and notification feed.
 */

export type PaymentLinkParty = { name: string; address: string; bps: number };

export type PaymentLink = {
  id: string;
  name: string;
  reference: string;
  amount: number;
  currency: string;
  parties: PaymentLinkParty[];
  url: string;
  status: "Active" | "Paused";
  createdAt: number;
};

export type MerchantStream = {
  id: string;
  name: string;
  role: string;
  address: string;
  ratePerSec: number;
  streamed: number;
  running: boolean;
  createdAt: number;
};

export type ApiKey = {
  id: string;
  label: string;
  value: string;
  createdAt: number;
};

export type MerchantNotification = {
  id: string;
  kind: "payment" | "split" | "stream" | "system";
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
};

export type MerchantData = {
  links: PaymentLink[];
  streams: MerchantStream[];
  apiKeys: ApiKey[];
  notifications: MerchantNotification[];
  businessName: string;
  settlementWallet: string;
  webhookUrl: string;
  defaultCurrency: string;
  autoSplit: boolean;
  emailReceipts: boolean;
  sandboxMode: boolean;
  firstSeenAt: number;
};

const EMPTY_DATA = (): MerchantData => ({
  links: [],
  streams: [],
  apiKeys: [],
  notifications: [],
  businessName: "",
  settlementWallet: "",
  webhookUrl: "",
  defaultCurrency: "USDC",
  autoSplit: true,
  emailReceipts: true,
  sandboxMode: false,
  firstSeenAt: Date.now(),
});

const keyFor = (address: string) => `coindecc:merchant:${address.toLowerCase()}`;

function normalizeMerchantData(value: unknown): MerchantData {
  if (!value || typeof value !== "object") return EMPTY_DATA();
  const saved = value as Partial<MerchantData>;
  return {
    links: Array.isArray(saved.links) ? saved.links : [],
    streams: Array.isArray(saved.streams) ? saved.streams : [],
    apiKeys: Array.isArray(saved.apiKeys) ? saved.apiKeys : [],
    notifications: Array.isArray(saved.notifications) ? saved.notifications : [],
    businessName: typeof saved.businessName === "string" ? saved.businessName : "",
    settlementWallet:
      typeof saved.settlementWallet === "string" ? saved.settlementWallet : "",
    webhookUrl: typeof saved.webhookUrl === "string" ? saved.webhookUrl : "",
    defaultCurrency:
      saved.defaultCurrency === "USDT" || saved.defaultCurrency === "USDC"
        ? saved.defaultCurrency
        : "USDC",
    autoSplit: typeof saved.autoSplit === "boolean" ? saved.autoSplit : true,
    emailReceipts:
      typeof saved.emailReceipts === "boolean" ? saved.emailReceipts : true,
    sandboxMode: typeof saved.sandboxMode === "boolean" ? saved.sandboxMode : false,
    firstSeenAt:
      typeof saved.firstSeenAt === "number" && Number.isFinite(saved.firstSeenAt)
        ? saved.firstSeenAt
        : Date.now(),
  };
}

function read(address: string): MerchantData {
  try {
    const raw = window.localStorage.getItem(keyFor(address));
    if (raw) return normalizeMerchantData(JSON.parse(raw));
  } catch {
    /* ignore corrupt storage */
  }
  return EMPTY_DATA();
}

function write(address: string, data: MerchantData) {
  try {
    window.localStorage.setItem(keyFor(address), JSON.stringify(data));
  } catch {
    /* quota exceeded — in-memory only */
  }
}

export const randomId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function useMerchantStore() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<MerchantData | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setData(null);
      return;
    }
    const loaded = read(address);
    // first-time merchants get their profile captured immediately
    if (!window.localStorage.getItem(keyFor(address))) write(address, loaded);
    setData(loaded);
  }, [address, isConnected]);

  const update = useCallback(
    (patch: (prev: MerchantData) => MerchantData) => {
      if (!address) return;
      setData((prev) => {
        const next = patch(prev ?? read(address));
        write(address, next);
        return next;
      });
    },
    [address],
  );

  const notify = useCallback(
    (n: Omit<MerchantNotification, "id" | "createdAt" | "read">) =>
      update((p) => ({
        ...p,
        notifications: [
          { ...n, id: randomId(), createdAt: Date.now(), read: false },
          ...p.notifications,
        ].slice(0, 50),
      })),
    [update],
  );

  return useMemo(
    () => ({
      address: address ?? null,
      isConnected: Boolean(isConnected && address),
      ready: data !== null,
      data: data ?? EMPTY_DATA(),
      update,
      notify,
    }),
    [address, isConnected, data, update, notify],
  );
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
