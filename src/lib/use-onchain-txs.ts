import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, isRouterContract } from "@/lib/web3";
import type { TxRecord } from "@/lib/tx-history";

/** Arc Testnet explorer index: complete USDC transfer history (faucet, external, contract). */
const EXPLORER_API = "https://explorer.testnet.arc.io/api/v2";

type ExplorerTransfer = {
  transaction_hash: string;
  timestamp: string;
  method: string | null;
  from: { hash: string };
  to: { hash: string };
  total: { decimals: string; value: string };
};
type ExplorerPage = { items: ExplorerTransfer[]; next_page_params: Record<string, string | number> | null };
export type TxPage = { records: TxRecord[]; next: string | undefined };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with exponential backoff; temporary timeouts and rate limits are retried quietly. */
async function getJson<T>(url: string, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
      clearTimeout(timer);
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return { items: [], next_page_params: null } as T; // address never seen
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      last = e;
    }
    await sleep(Math.min(8000, 600 * 2 ** i) + Math.random() * 300);
  }
  throw last;
}

const amountOf = (t: ExplorerTransfer) => Number(t.total.value) / 10 ** Number(t.total.decimals || 6);

async function fetchPage(address: string, cursor: string | undefined): Promise<TxPage> {
  const qs = new URLSearchParams(cursor ? JSON.parse(cursor) : {});
  qs.set("token", USDC_ADDRESS);
  const page = await getJson<ExplorerPage>(`${EXPLORER_API}/addresses/${address}/token-transfers?${qs}`);
  const me = address.toLowerCase();
  const pay = COINDECC_PAY_ADDRESS.toLowerCase();

  const byHash = new Map<string, ExplorerTransfer[]>();
  for (const t of page.items ?? []) {
    const g = byHash.get(t.transaction_hash) ?? [];
    g.push(t);
    byHash.set(t.transaction_hash, g);
  }

  const records = await Promise.all(
    [...byHash].map(async ([hash, group]): Promise<TxRecord> => {
      const paid = group.find((t) => t.to.hash.toLowerCase() === pay);
      const sent = group.filter((t) => t.from.hash.toLowerCase() === me);
      const recv = group.filter((t) => t.to.hash.toLowerCase() === me);
      const first = paid ?? sent[0] ?? recv[0] ?? group[0]!;
      let transfers: { address: string; amount: number }[] = [];
      // Split legs leave from a router contract, so they live on the transaction, not the wallet.
      if (group.some((t) => isRouterContract(t.to.hash) || isRouterContract(t.from.hash))) {
        try {
          const legs = await getJson<ExplorerPage>(`${EXPLORER_API}/transactions/${hash}/token-transfers?type=ERC-20`, 2);
          transfers = legs.items
            .filter((t) => isRouterContract(t.from.hash) && !isRouterContract(t.to.hash))
            .map((t) => ({ address: t.to.hash, amount: amountOf(t) }));
        } catch { /* legs are optional detail */ }
      }
      const sum = (l: ExplorerTransfer[]) => l.reduce((a, t) => a + amountOf(t), 0);
      // Show the real payer/recipient wallet, never the routing contract.
      const from = first.from.hash;
      const to = isRouterContract(first.to.hash) && transfers.length === 1 ? transfers[0]!.address : first.to.hash;
      return {
        hash,
        kind: paid ? "payment" : "split",
        from,
        to,
        amount: paid ? amountOf(paid) : sent.length ? sum(sent) : sum(recv),
        timestamp: Date.parse(first.timestamp) || 0,
        label: paid ? "Checkout payment" : sent.length ? "USDC sent" : "USDC received",
        transfers,
      };
    }),
  );
  return {
    records: records.sort((a, b) => b.timestamp - a.timestamp),
    next: page.next_page_params ? JSON.stringify(page.next_page_params) : undefined,
  };
}

const retry = { retry: 5, retryDelay: (n: number) => Math.min(30_000, 1000 * 2 ** n) };

/** Full wallet USDC history (incl. faucet + external transfers), paged back to the first transfer. */
export function useOnchainTxs(address?: `0x${string}`) {
  return useInfiniteQuery({
    queryKey: ["coindecc-onchain-txs", address?.toLowerCase()],
    enabled: Boolean(address),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchPage(address!, pageParam),
    getNextPageParam: (page) => page.next,
    staleTime: Infinity,
    ...retry,
  });
}

/** Newest page only, polled every few seconds for real-time arrivals. */
export function useLatestTxs(address?: string | null) {
  return useQuery({
    queryKey: ["coindecc-latest-txs", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: () => fetchPage(address!, undefined),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
    ...retry,
  });
}
