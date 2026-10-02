import { useEffect, useSyncExternalStore } from "react";

export type CurrencyCode = "USD" | "NGN" | "GHS" | "KES" | "ZAR";

export type Currency = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  flag: string;
  /** local units per 1 USDC (live when available) */
  rate: number;
};

/** Static last-resort rates, used only before any live or cached rate exists. */
const BASE: Currency[] = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸", rate: 1 },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 1543.2 },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭", rate: 12.42 },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", rate: 129.85 },
  { code: "ZAR", label: "South African Rand", symbol: "R", flag: "🇿🇦", rate: 18.06 },
];

export type FxState = {
  rates: Record<CurrencyCode, number>;
  updatedAt: number; // 0 = never fetched live
  source: "live" | "cached" | "default";
  loading: boolean;
};

const CODES = BASE.map((c) => c.code);
const CACHE_KEY = "coindecc:fx-rates";
/** Rates are locked for this window so a buyer's quote doesn't move mid-checkout. */
export const FX_TTL = 5 * 60 * 1000;

let state: FxState = {
  rates: Object.fromEntries(BASE.map((c) => [c.code, c.rate])) as Record<CurrencyCode, number>,
  updatedAt: 0,
  source: "default",
  loading: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<FxState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function validRates(raw: unknown): Record<CurrencyCode, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out = {} as Record<CurrencyCode, number>;
  for (const c of CODES) {
    const v = r[c];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
    out[c] = v;
  }
  return out;
}

let hydrated = false;
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as { rates?: unknown; updatedAt?: unknown } | null;
    const rates = validRates(saved?.rates);
    if (rates && typeof saved?.updatedAt === "number") set({ rates, updatedAt: saved.updatedAt, source: "cached" });
  } catch { /* ignore corrupt cache */ }
}

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

let inflight: Promise<void> | null = null;
export function refreshFx(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  hydrate();
  if (!force && state.updatedAt && Date.now() - state.updatedAt < FX_TTL) return Promise.resolve();
  if (inflight) return inflight;
  set({ loading: true });
  inflight = (async () => {
    // Fiat FX (USD base) + USDC/USD market price from CoinGecko; either may fail independently.
    const [fx, cg] = await Promise.allSettled([
      getJson("https://open.er-api.com/v6/latest/USD"),
      getJson("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd"),
    ]);
    const fiat = fx.status === "fulfilled" ? (fx.value as { rates?: Record<string, unknown> })?.rates : undefined;
    const usdcRaw = cg.status === "fulfilled" ? (cg.value as { "usd-coin"?: { usd?: unknown } })?.["usd-coin"]?.usd : undefined;
    const usdc = typeof usdcRaw === "number" && usdcRaw > 0.9 && usdcRaw < 1.1 ? usdcRaw : 1;
    const merged = fiat ? validRates(Object.fromEntries(CODES.map((c) => [c, c === "USD" ? 1 : fiat[c]]))) : null;
    if (merged) {
      const rates = Object.fromEntries(CODES.map((c) => [c, merged[c] * usdc])) as Record<CurrencyCode, number>;
      const updatedAt = Date.now();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, updatedAt })); } catch { /* ignore */ }
      set({ rates, updatedAt, source: "live", loading: false });
    } else {
      // Keep the most recent cached rate; never zero out the widget.
      set({ loading: false, source: state.updatedAt ? "cached" : "default" });
    }
  })().finally(() => { inflight = null; });
  return inflight;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => state;

/** Live FX rates; refreshes every 5 minutes while mounted. */
export function useFxRates() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    void refreshFx();
    const id = window.setInterval(() => void refreshFx(), FX_TTL);
    return () => window.clearInterval(id);
  }, []);
  return s;
}

export const CURRENCIES: Currency[] = BASE;

export const getCurrency = (code: CurrencyCode): Currency => {
  const base = BASE.find((c) => c.code === code) ?? BASE[0]!;
  return { ...base, rate: state.rates[base.code] ?? base.rate };
};

export function formatLocal(usdc: number, code: CurrencyCode) {
  const c = getCurrency(code);
  const value = usdc * c.rate;
  return `${c.symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const formatUsdc = (n: number) =>
  `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
