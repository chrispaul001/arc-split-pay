import { useInfiniteQuery } from "@tanstack/react-query";
import { formatUnits, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import type { TxRecord } from "@/lib/tx-history";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const WINDOW = 9_500n;
const CHUNKS = 10;

/** Wallet transfers AND contract pay()/split transfers, paged back through Arc logs. */
export function useOnchainTxs(address?: `0x${string}`) {
  const client = usePublicClient({ chainId: arcTestnet.id });
  return useInfiniteQuery({
    queryKey: ["coindecc-onchain-txs", address?.toLowerCase()],
    enabled: Boolean(client && address),
    refetchInterval: 30_000,
    initialPageParam: null as bigint | null,
    getNextPageParam: (page) => page.next,
    queryFn: async ({ pageParam }): Promise<{ records: TxRecord[]; next: bigint | undefined }> => {
      if (!client || !address) return { records: [], next: undefined };
      const latest = pageParam ?? await client.getBlockNumber();
      const logs: Awaited<ReturnType<typeof client.getLogs<typeof TRANSFER>>> = [];
      let to = latest;
      let scanned = 0;
      for (let i = 0; i < CHUNKS && to >= 0n; i++) {
        const from = to > WINDOW ? to - WINDOW : 0n;
        const [sent, recv, contractOut, contractIn] = await Promise.all([
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { from: address }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: address }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { from: COINDECC_PAY_ADDRESS }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: COINDECC_PAY_ADDRESS }, fromBlock: from, toBlock: to }),
        ]);
        logs.push(...sent, ...recv, ...contractOut, ...contractIn);
        scanned++;
        if (from === 0n) { to = -1n; break; }
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
      return { records: records.sort((a, b) => b.timestamp - a.timestamp), next: scanned === CHUNKS && to >= 0n ? to : undefined };
    },
  });
}
