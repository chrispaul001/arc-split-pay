import { useInfiniteQuery } from "@tanstack/react-query";
import { formatUnits, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import type { TxRecord } from "@/lib/tx-history";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const WINDOW = 9_500n;
const CHUNKS = 10;

const scanKey = (a: string) => `coindecc:scan:${a.toLowerCase()}`;
/** Highest block already fully indexed for this wallet (everything below is saved). */
export function readSyncedTo(a: string): bigint | null {
  try { const v = localStorage.getItem(scanKey(a)); return v ? BigInt(v) : null; } catch { return null; }
}
export function writeSyncedTo(a: string, block: bigint) {
  try { localStorage.setItem(scanKey(a), block.toString()); } catch { /* ignore */ }
}

let deployBlock: Promise<bigint> | null = null;
/** First block where the CoindeccPay contract exists: the floor for history scans. */
function findDeployBlock(client: NonNullable<ReturnType<typeof usePublicClient>>, latest: bigint) {
  if (!deployBlock) {
    deployBlock = (async () => {
      const cached = typeof window !== "undefined" ? localStorage.getItem("coindecc:deploy-block") : null;
      if (cached) return BigInt(cached);
      let lo = 0n, hi = latest;
      while (lo < hi) {
        const mid = (lo + hi) / 2n;
        const code = await client.getCode({ address: COINDECC_PAY_ADDRESS, blockNumber: mid }).catch(() => undefined);
        if (code && code !== "0x") hi = mid; else lo = mid + 1n;
      }
      localStorage.setItem("coindecc:deploy-block", lo.toString());
      return lo;
    })().catch((e) => { deployBlock = null; throw e; });
  }
  return deployBlock;
}

/** Wallet transfers AND contract pay()/split transfers, paged back through Arc logs. */
export function useOnchainTxs(address?: `0x${string}`) {
  const client = usePublicClient({ chainId: arcTestnet.id });
  return useInfiniteQuery({
    queryKey: ["coindecc-onchain-txs", address?.toLowerCase()],
    enabled: Boolean(client && address),
    // Pause polling while backfilling so older pages are not re-scanned repeatedly.
    refetchInterval: (q) => (q.state.data?.pages.at(-1)?.next !== undefined ? false : 30_000),
    initialPageParam: null as bigint | null,
    queryFn: async ({ pageParam }): Promise<{ records: TxRecord[]; next: bigint | undefined; head: bigint }> => {
      if (!client || !address) return { records: [], next: undefined, head: 0n };
      const head = await client.getBlockNumber();
      const latest = pageParam ?? head;
      // Scan down to the last fully indexed block (or the contract's deployment on first sync).
      const synced = readSyncedTo(address);
      const floor = synced !== null ? synced + 1n : await findDeployBlock(client, head);
      const logs: Awaited<ReturnType<typeof client.getLogs<typeof TRANSFER>>> = [];
      let to = latest;
      let scanned = 0;
      for (let i = 0; i < CHUNKS && to >= floor; i++) {
        const from = to - floor > WINDOW ? to - WINDOW : floor;
        const [sent, recv, contractOut, contractIn] = await Promise.all([
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { from: address }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: address }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { from: COINDECC_PAY_ADDRESS }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: COINDECC_PAY_ADDRESS }, fromBlock: from, toBlock: to }),
        ]);
        logs.push(...sent, ...recv, ...contractOut, ...contractIn);
        scanned++;
        if (from === floor) { to = floor - 1n; break; }
        to = from - 1n;
      }
      const blocks = [...new Set(logs.map((l) => l.blockNumber).filter((b): b is bigint => b !== null))];
      const times = new Map(await Promise.all(blocks.map(async (b) => [b, Number((await client.getBlock({ blockNumber: b })).timestamp) * 1000] as const)));
      const tsOf = (b: bigint | null) => times.get(b ?? -1n) ?? 0;
      const me = address.toLowerCase();
      const pay = COINDECC_PAY_ADDRESS.toLowerCase();

      // Deduplicate overlapping queries and group all legs of one atomic pay() receipt.
      const byHash = new Map<string, typeof logs>();
      for (const l of logs) {
        if (!l.transactionHash) continue;
        const group = byHash.get(l.transactionHash) ?? [];
        if (!group.some((v) => v.logIndex === l.logIndex && v.blockNumber === l.blockNumber)) group.push(l);
        byHash.set(l.transactionHash, group);
      }
      const records: TxRecord[] = [...byHash].map(([hash, group]) => {
        const paid = group.find((l) => l.args.to?.toLowerCase() === pay && l.args.from?.toLowerCase() !== pay);
        const outgoing = group.filter((l) => l.args.from?.toLowerCase() === me && l.args.to?.toLowerCase() !== pay);
        const splitLegs = group.filter((l) => l.args.from?.toLowerCase() === pay);
        const first = paid ?? outgoing[0] ?? group[0];
        const amount = paid ? Number(formatUnits(paid.args.value ?? 0n, 6)) :
          outgoing.length ? outgoing.reduce((sum, l) => sum + Number(formatUnits(l.args.value ?? 0n, 6)), 0) :
          group.filter((l) => l.args.to?.toLowerCase() === me).reduce((sum, l) => sum + Number(formatUnits(l.args.value ?? 0n, 6)), 0);
        return {
          hash,
          kind: paid ? "payment" as const : "split" as const,
          from: first?.args.from ?? "",
          to: first?.args.to,
          amount,
          timestamp: tsOf(first?.blockNumber ?? null),
          label: paid ? "CoindeccPay pay()" : outgoing.length ? "USDC sent" : "USDC received",
          transfers: splitLegs.map((l) => ({ address: l.args.to ?? "", amount: Number(formatUnits(l.args.value ?? 0n, 6)) })),
        };
      });
      return { records: records.sort((a, b) => b.timestamp - a.timestamp), next: scanned === CHUNKS && to >= floor ? to : undefined, head };
    },
    getNextPageParam: (page) => page.next,
  });
}
