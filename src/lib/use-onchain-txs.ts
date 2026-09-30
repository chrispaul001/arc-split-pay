import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import type { TxRecord } from "@/lib/tx-history";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const WINDOW = 9_500n;
const CHUNKS = 10;

/** USDC transfers sent from / received by the wallet on Arc Testnet, read straight from chain logs. */
export function useOnchainTxs(address?: `0x${string}`) {
  const client = usePublicClient({ chainId: arcTestnet.id });
  return useQuery({
    queryKey: ["coindecc-onchain-txs", address?.toLowerCase()],
    enabled: Boolean(client && address),
    refetchInterval: 30_000,
    queryFn: async (): Promise<TxRecord[]> => {
      if (!client || !address) return [];
      const latest = await client.getBlockNumber();
      const logs: Awaited<ReturnType<typeof client.getLogs<typeof TRANSFER>>> = [];
      let to = latest;
      for (let i = 0; i < CHUNKS && to > 0n; i++) {
        const from = to > WINDOW ? to - WINDOW : 0n;
        try {
          const [sent, recv] = await Promise.all([
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { from: address }, fromBlock: from, toBlock: to }),
            client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: address }, fromBlock: from, toBlock: to }),
          ]);
          logs.push(...sent, ...recv);
        } catch {
          break;
        }
        to = from - 1n;
      }
      const [lb, rb] = await Promise.all([
        client.getBlock({ blockNumber: latest }),
        client.getBlock({ blockNumber: latest > 100n ? latest - 100n : 0n }),
      ]);
      const bt = Number(lb.timestamp - rb.timestamp) / Number(latest - rb.number || 1n);
      const tsOf = (b: bigint) => (Number(lb.timestamp) - Number(latest - b) * bt) * 1000;
      const me = address.toLowerCase();
      const pay = COINDECC_PAY_ADDRESS.toLowerCase();

      // Group by tx hash: a split send emits several transfers in one tx.
      const byHash = new Map<string, TxRecord>();
      for (const l of logs) {
        const hash = l.transactionHash as string;
        const f = (l.args.from ?? "").toLowerCase();
        const t = (l.args.to ?? "").toLowerCase();
        const amt = Number(formatUnits(l.args.value ?? 0n, 6));
        const outgoing = f === me;
        const existing = byHash.get(hash);
        if (existing) {
          if (outgoing && t !== pay) {
            existing.kind = existing.kind === "payment" ? "payment" : "split";
            existing.amount += amt;
          }
          continue;
        }
        byHash.set(hash, {
          hash,
          kind: t === pay ? "payment" : "split",
          from: l.args.from as string,
          to: l.args.to as string,
          amount: amt,
          timestamp: tsOf(l.blockNumber as bigint),
          label: t === pay ? "CoindeccPay checkout" : outgoing ? "USDC sent" : "USDC received",
        });
      }
      return [...byHash.values()].sort((a, b) => b.timestamp - a.timestamp);
    },
  });
}
