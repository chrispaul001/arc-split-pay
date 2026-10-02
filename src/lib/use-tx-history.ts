import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useOnchainTxs, writeSyncedTo } from "@/lib/use-onchain-txs";
import { mergeTxs, readTxs, subscribeTxs, type TxRecord } from "@/lib/tx-history";
import { loadTxHistory, saveTxHistory } from "@/lib/tx-history.functions";

const tokenOf = (a: string) => (typeof window === "undefined" ? null : localStorage.getItem(`coindecc:session:${a.toLowerCase()}`));

/**
 * Permanent wallet history: backend copy + browser cache + every Arc log ever scanned.
 * Chain results are written into the cache/backend so records survive refreshes and new days.
 */
export function useTxHistory(address?: `0x${string}`) {
  const chain = useOnchainTxs(address);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [synced, setSynced] = useState(false);
  const load = useServerFn(loadTxHistory);
  const save = useServerFn(saveTxHistory);
  const pushed = useRef(new Set<string>());

  useEffect(() => {
    setSynced(false);
    pushed.current = new Set();
    if (!address) return setTxs([]);
    const refresh = () => setTxs(readTxs(address));
    refresh();
    const unsub = subscribeTxs(refresh);
    const token = tokenOf(address);
    let alive = true;
    (async () => {
      if (token) {
        try {
          const remote = JSON.parse((await load({ data: { token } })).json) as TxRecord[];
          remote.forEach((r) => pushed.current.add(r.hash.toLowerCase()));
          if (alive) mergeTxs(address, remote);
          // Backfill anything only this browser knew about.
          const missing = readTxs(address).filter((t) => !pushed.current.has(t.hash.toLowerCase()));
          for (let i = 0; i < missing.length; i += 500) {
            await save({ data: { token, records: missing.slice(i, i + 500) } });
          }
          missing.forEach((t) => pushed.current.add(t.hash.toLowerCase()));
        } catch { /* offline: cache still works */ }
      }
      if (alive) setSynced(true);
    })();
    return () => { alive = false; unsub(); };
  }, [address, load, save]);

  // Persist every chain record we discover, and push new or updated local ones.
  useEffect(() => {
    if (!address || !synced) return;
    const fromChain = (chain.data?.pages ?? []).flatMap((p) => p.records);
    mergeTxs(address, fromChain);
    const token = tokenOf(address);
    const fresh = readTxs(address).filter((t) => !pushed.current.has(t.hash.toLowerCase()));
    if (!token || !fresh.length) return;
    fresh.forEach((t) => pushed.current.add(t.hash.toLowerCase()));
    (async () => {
      for (let i = 0; i < fresh.length; i += 500) {
        try { await save({ data: { token, records: fresh.slice(i, i + 500) } }); }
        catch { fresh.slice(i, i + 500).forEach((t) => pushed.current.delete(t.hash.toLowerCase())); }
      }
    })();
  }, [address, synced, chain.data, txs.length, save]);

  // Keep paging back automatically until the whole wallet history is indexed and saved.
  useEffect(() => {
    if (!address || !synced || !chain.data || chain.isFetchingNextPage || chain.isError) return;
    if (chain.hasNextPage) { void chain.fetchNextPage(); return; }
    const pages = chain.data.pages;
    // Everything from the first page's head down is now persisted; next session only scans newer blocks.
    const head = pages[0]?.head;
    if (head) writeSyncedTo(address, head);
  }, [address, synced, chain.data, chain.hasNextPage, chain.isFetchingNextPage, chain.isError]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => [...txs].sort((a, b) => b.timestamp - a.timestamp), [txs]);
  return {
    txs: sorted,
    chain,
    loading: !synced || (chain.isPending && txs.length === 0),
    backfilling: synced && (chain.isPending || chain.hasNextPage || chain.isFetchingNextPage),
  };
}
