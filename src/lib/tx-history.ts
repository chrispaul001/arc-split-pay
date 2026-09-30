/** Wallet-scoped audit trail of confirmed on-chain transactions (browser cache). */
export type TxKind = "payment" | "split" | "stream";
export type TxRecord = {
  hash: string;
  kind: TxKind;
  from: string;
  to?: string;
  label?: string;
  amount: number;
  timestamp: number;
  splits?: { name: string; address: string; bps: number }[];
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

export function subscribeTxs(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key?.startsWith("coindecc:txlog:") && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
