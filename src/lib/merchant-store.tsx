import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConfig, useSignMessage, useWatchContractEvent } from "wagmi";
import { getBlock, getTransactionReceipt } from "wagmi/actions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { decodeEventLog, formatUnits, parseAbi } from "viem";
import { toast } from "sonner";
import { useBrand } from "@/lib/brand";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import { loadProfile, saveProfile, signInMessage, walletSignIn } from "@/lib/profile.functions";
import { readPayments, type SettledPayment } from "@/lib/payment-events";

const TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

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
  /** USDC already settled on-chain for this stream */
  settled?: number;
  lastSettleTx?: string;
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
  payment?: { hash: string; sender: string; amount: number; currency: "USDC"; splits: { address: string; amount: number }[] };
};

export type TeamRole = "Admin" | "Developer" | "Viewer";

export type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  status: "Pending";
  createdAt: number;
};

export type MerchantData = {
  links: PaymentLink[];
  streams: MerchantStream[];
  apiKeys: ApiKey[];
  notifications: MerchantNotification[];
  team: TeamMember[];
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
  team: [],
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

const ROLES: TeamRole[] = ["Admin", "Developer", "Viewer"];

function normalizeTeam(value: unknown): TeamMember[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const t = m as Partial<TeamMember>;
    if (typeof t.email !== "string" || !t.email) return [];
    return [{
      id: typeof t.id === "string" ? t.id : randomId(),
      email: t.email,
      role: ROLES.includes(t.role as TeamRole) ? (t.role as TeamRole) : "Viewer",
      status: "Pending" as const,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    }];
  });
}

function normalizeMerchantData(value: unknown): MerchantData {
  if (!value || typeof value !== "object") return EMPTY_DATA();
  const saved = value as Partial<MerchantData>;
  return {
    links: Array.isArray(saved.links) ? saved.links : [],
    streams: Array.isArray(saved.streams) ? saved.streams : [],
    apiKeys: Array.isArray(saved.apiKeys) ? saved.apiKeys : [],
    notifications: Array.isArray(saved.notifications) ? saved.notifications.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const n = item as Partial<MerchantNotification>;
      if (typeof n.id !== "string" || typeof n.title !== "string" || typeof n.body !== "string") return [];
      const payment = n.payment;
      return [{
        id: n.id, title: n.title, body: n.body,
        kind: ["payment", "split", "stream", "system"].includes(n.kind ?? "") ? n.kind as MerchantNotification["kind"] : "system" as const,
        createdAt: typeof n.createdAt === "number" && Number.isFinite(n.createdAt) ? n.createdAt : Date.now(),
        read: n.read === true,
        ...(payment && typeof payment.hash === "string" && /^0x[a-f0-9]{64}$/i.test(payment.hash) &&
          typeof payment.sender === "string" && /^0x[a-f0-9]{40}$/i.test(payment.sender) &&
          typeof payment.amount === "number" && Number.isFinite(payment.amount) && payment.amount > 0 ? {
          payment: { hash: payment.hash, sender: payment.sender, amount: payment.amount, currency: "USDC" as const,
            splits: Array.isArray(payment.splits) ? payment.splits.filter((s) => s && typeof s.address === "string" && typeof s.amount === "number" && Number.isFinite(s.amount)) : [] },
        } : {}),
      }];
    }) : [],
    team: normalizeTeam(saved.team),
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

type StoreCtx = {
  address: string | null;
  isConnected: boolean;
  ready: boolean;
  synced: boolean;
  data: MerchantData;
  update: (patch: (prev: MerchantData) => MerchantData) => void;
  notify: (n: Omit<MerchantNotification, "id" | "createdAt" | "read">) => void;
};

const MerchantContext = createContext<StoreCtx | null>(null);

const tokenKey = (a: string) => `coindecc:session:${a.toLowerCase()}`;

/**
 * Wallet-bound store. The connected address is the primary key in the
 * backend; the wallet signs once per device to prove ownership, then the
 * profile loads on any browser. localStorage is only a fast offline cache.
 */
export function MerchantProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const config = useConfig();
  const { signMessageAsync } = useSignMessage();
  const brand = useBrand();
  const [data, setData] = useState<MerchantData | null>(null);
  const [synced, setSynced] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const dataRef = useRef<MerchantData | null>(null);
  const brandRef = useRef(brand);
  brandRef.current = brand;
  const saveTimer = useRef<number | undefined>(undefined);
  const signIn = useServerFn(walletSignIn);
  const load = useServerFn(loadProfile);
  const save = useServerFn(saveProfile);

  const pushRemote = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const token = tokenRef.current;
      const d = dataRef.current;
      if (!token || !d) return;
      const b = brandRef.current;
      void save({
        data: {
          token,
          data: d as unknown as Record<string, unknown>,
          brand: { avatar: b.avatar, logo: b.logo, businessName: b.businessName, settlementWallet: b.settlementWallet },
        },
      }).catch(() => toast.error("Couldn't sync to the cloud", { description: "Saved on this device; will retry on next change." }));
    }, 700);
  }, [save]);

  useEffect(() => {
    tokenRef.current = null;
    setSynced(false);
    if (!isConnected || !address) {
      dataRef.current = null;
      setData(null);
      return;
    }
    let cancelled = false;
    const cached = read(address);
    dataRef.current = cached;
    setData(cached);

    (async () => {
      try {
        let token = window.localStorage.getItem(tokenKey(address));
        if (!token) {
          const issuedAt = Date.now();
          const signature = await signMessageAsync({ message: signInMessage(address, issuedAt) });
          token = (await signIn({ data: { address, issuedAt, signature } })).token;
          window.localStorage.setItem(tokenKey(address), token);
        }
        let res: { exists: boolean; data: unknown; brand: unknown };
        try {
          const r = await load({ data: { token } });
          res = { exists: r.exists, ...(JSON.parse(r.json) as { data: unknown; brand: unknown }) };
        } catch (e) {
          window.localStorage.removeItem(tokenKey(address));
          throw e;
        }
        if (cancelled) return;
        tokenRef.current = token;
        const b = brandRef.current;
        if (res.exists) {
          const remote = normalizeMerchantData(res.data);
          dataRef.current = remote;
          write(address, remote);
          setData(remote);
          const rb = (res.brand ?? {}) as Record<string, unknown>;
          b.setImage("avatar", typeof rb["avatar"] === "string" ? rb["avatar"] : null);
          b.setImage("logo", typeof rb["logo"] === "string" ? rb["logo"] : null);
          b.setProfile({
            businessName: typeof rb["businessName"] === "string" && rb["businessName"] ? rb["businessName"] : "My Business",
            settlementWallet: typeof rb["settlementWallet"] === "string" ? rb["settlementWallet"] : "",
          });
        } else {
          // brand-new wallet: clean default profile, nothing carried over
          const fresh = EMPTY_DATA();
          dataRef.current = fresh;
          write(address, fresh);
          setData(fresh);
          b.setImage("avatar", null);
          b.setImage("logo", null);
          b.setProfile({ businessName: "My Business", settlementWallet: "" });
          pushRemote();
        }
        setSynced(true);
      } catch {
        if (!cancelled)
          toast("Using this device's copy", {
            description: "Sign the wallet message to sync your profile across browsers.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // brand edits (avatar, logo, name) also sync to the wallet record
  useEffect(() => {
    if (synced) pushRemote();
  }, [brand.avatar, brand.logo, brand.businessName, brand.settlementWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (patch: (prev: MerchantData) => MerchantData) => {
      if (!address) return;
      const next = patch(dataRef.current ?? read(address));
      dataRef.current = next;
      write(address, next);
      setData(next);
      pushRemote();
    },
    [address, pushRemote],
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

  // Confirmed receipts are the source of truth. The queue also bridges a separate checkout tab.
  const queryClient = useQueryClient();
  const pending = useRef(new Set<string>());
  const ingestPayment = useCallback(async (payment: SettledPayment) => {
    if (!address || !isConnected) return;
    const key = payment.hash.toLowerCase();
    if (pending.current.has(key) || dataRef.current?.notifications.some((n) => n.payment?.hash.toLowerCase() === key)) return;
    pending.current.add(key);
    try {
      const receipt = await getTransactionReceipt(config, { hash: payment.hash, chainId: arcTestnet.id });
      if (receipt.status !== "success") return;
      const block = await getBlock(config, { blockNumber: receipt.blockNumber, chainId: arcTestnet.id });
      const transfers = receipt.logs.flatMap((log) => {
        if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) return [];
        try {
          const decoded = decodeEventLog({ abi: TRANSFER_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== "Transfer") return [];
          return [{ from: decoded.args.from, to: decoded.args.to, amount: Number(formatUnits(decoded.args.value, 6)) }];
        } catch { return []; }
      });
      const sender = transfers.find((t) => t.to.toLowerCase() === COINDECC_PAY_ADDRESS.toLowerCase())?.from ?? payment.sender;
      const amount = transfers.find((t) => t.to.toLowerCase() === COINDECC_PAY_ADDRESS.toLowerCase())?.amount ?? payment.amount;
      const splits = transfers.filter((t) =>
        (t.from.toLowerCase() === COINDECC_PAY_ADDRESS.toLowerCase() || t.from.toLowerCase() === sender.toLowerCase()) &&
        t.to.toLowerCase() !== COINDECC_PAY_ADDRESS.toLowerCase() && t.to.toLowerCase() !== sender.toLowerCase())
        .map((t) => ({ address: t.to, amount: t.amount }));
      // Show only payments sent by this wallet or settled to this wallet.
      if (sender.toLowerCase() !== address.toLowerCase() && !splits.some((s) => s.address.toLowerCase() === address.toLowerCase())) return;
      const title = sender.toLowerCase() === address.toLowerCase() ? "Payment sent & split" : "Payment received";
      const body = `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC from ${sender.slice(0, 6)}…${sender.slice(-4)}`;
      update((prev) => prev.notifications.some((n) => n.payment?.hash.toLowerCase() === key) ? prev : ({
        ...prev,
        notifications: [{ id: randomId(), kind: "payment" as const, title, body, createdAt: Number(block.timestamp) * 1000,
          read: false, payment: { hash: payment.hash, sender, amount, currency: "USDC" as const, splits } }, ...prev.notifications].slice(0, 50),
      }));
      void queryClient.invalidateQueries({ queryKey: ["coindecc-telemetry"] });
    } catch { /* RPC may be temporarily unavailable; the queue is retried on next visit */ }
    finally { pending.current.delete(key); }
  }, [address, isConnected, config, update, queryClient]);

  useEffect(() => {
    if (!address || !isConnected) return;
    const onPayment = (event: Event) => {
      const payment = (event as CustomEvent<SettledPayment>).detail;
      if (payment && typeof payment.hash === "string") void ingestPayment(payment);
    };
    window.addEventListener("coindecc:payment-settled", onPayment);
    const sync = () => { for (const payment of readPayments(address)) void ingestPayment(payment); };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("coindecc:payment-settled", onPayment);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [address, isConnected, synced, ingestPayment]);

  useWatchContractEvent({
    address: USDC_ADDRESS,
    abi: TRANSFER_ABI,
    eventName: "Transfer",
    args: { to: COINDECC_PAY_ADDRESS },
    chainId: arcTestnet.id,
    enabled: Boolean(isConnected && address),
    pollingInterval: 4_000,
    onLogs: (logs) => {
      for (const log of logs) {
        if (log.transactionHash && log.args.from && log.args.value)
          void ingestPayment({ hash: log.transactionHash, sender: log.args.from,
            amount: Number(formatUnits(log.args.value, 6)) });
      }
    },
  });

  const value = useMemo<StoreCtx>(
    () => ({
      address: address ?? null,
      isConnected: Boolean(isConnected && address),
      ready: data !== null,
      synced,
      data: data ?? EMPTY_DATA(),
      update,
      notify,
    }),
    [address, isConnected, data, synced, update, notify],
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}

const FALLBACK: StoreCtx = {
  address: null,
  isConnected: false,
  ready: false,
  synced: false,
  data: EMPTY_DATA(),
  update: () => {},
  notify: () => {},
};

export function useMerchantStore() {
  return useContext(MerchantContext) ?? FALLBACK;
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
