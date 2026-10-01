/** Wallet-scoped audit trail of confirmed on-chain transactions (browser cache). */
export type TxKind = "payment" | "split" | "stream";
export type TxRecord = {
  hash: string;
  kind: TxKind;
  from: string;
  to?: string | undefined;
  label?: string | undefined;
  amount: number;
  timestamp: number;
  splits?: { name: string; address: string; bps: number }[] | undefined;
  transfers?: { address: string; amount: number }[] | undefined;
};

const EVENT = "coindecc:tx-recorded";
const key = (a: string) => `coindecc:txlog:${a.toLowerCase()}`;

export function readTxs(address: string): TxRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key(address)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (t): t is TxRecord =>
        t && typeof t.hash === "string" && typeof t.amount === "number" && typeof t.timestamp === "number",
    );
  } catch {
    return [];
  }
}

export function recordTx(tx: Omit<TxRecord, "timestamp"> & { timestamp?: number }) {
  if (typeof window === "undefined" || !tx.from) return;
  const list = readTxs(tx.from).filter((t) => t.hash !== tx.hash);
  list.unshift({ ...tx, timestamp: tx.timestamp ?? Date.now() });
  try {
    localStorage.setItem(key(tx.from), JSON.stringify(list.slice(0, 500)));
  } catch {
    /* storage full */
  }
  window.dispatchEvent(new Event(EVENT));
}

const MAX = 5000;

/** Merge records into the wallet cache (local labels win, chain fills gaps). Returns hashes that were new. */
export function mergeTxs(address: string, incoming: TxRecord[]): string[] {
  if (typeof window === "undefined" || !address || !incoming.length) return [];
  const map = new Map(readTxs(address).map((t) => [t.hash.toLowerCase(), t]));
  const added: string[] = [];
  let changed = false;
  for (const t of incoming) {
    if (!t || typeof t.hash !== "string" || typeof t.amount !== "number") continue;
    const k = t.hash.toLowerCase();
    const cur = map.get(k);
    if (!cur) { map.set(k, t); added.push(k); changed = true; continue; }
    const next = { ...t, ...cur, timestamp: cur.timestamp || t.timestamp, transfers: cur.transfers?.length ? cur.transfers : t.transfers };
    if (JSON.stringify(next) !== JSON.stringify(cur)) { map.set(k, next); changed = true; }
  }
  if (!changed) return [];
  const list = [...map.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX);
  try {
    localStorage.setItem(key(address), JSON.stringify(list));
  } catch {
    /* storage full */
  }
  window.dispatchEvent(new Event(EVENT));
  return added;
}

export function subscribeTxs(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key?.startsWith("coindecc:txlog:") && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
