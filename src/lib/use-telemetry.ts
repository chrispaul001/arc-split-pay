import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, arcTestnet } from "@/lib/web3";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const WINDOW = 9_500n; // blocks per getLogs call (RPC range limit safe)
const CHUNKS = 6;

export type PaymentEvent = {
  hash: `0x${string}`;
  from: `0x${string}`;
  amount: number;
  block: bigint;
  timestamp: number;
};

/**
 * Live telemetry from the CoindeccPay contract: every USDC transfer settled
 * into 0xbD13…2Acd on Arc Testnet (i.e. each successful pay()).
 */
export function useTelemetry() {
  const client = usePublicClient({ chainId: arcTestnet.id });

  return useQuery({
    queryKey: ["coindecc-telemetry", COINDECC_PAY_ADDRESS],
    enabled: Boolean(client),
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!client) throw new Error("No client");
      const latest = await client.getBlockNumber();
      const logs = [];
      let to = latest;
      for (let i = 0; i < CHUNKS && to > 0n; i++) {
        const from = to > WINDOW ? to - WINDOW : 0n;
        try {
          const chunk = await client.getLogs({
            address: USDC_ADDRESS,
            event: TRANSFER,
            args: { to: COINDECC_PAY_ADDRESS },
            fromBlock: from,
            toBlock: to,
          });
          logs.push(...chunk);
        } catch {
          break;
        }
        to = from - 1n;
      }

      const [latestBlock, refBlock] = await Promise.all([
        client.getBlock({ blockNumber: latest }),
        client.getBlock({ blockNumber: latest > 100n ? latest - 100n : 0n }),
      ]);
      const blockTime =
        Number(latestBlock.timestamp - refBlock.timestamp) / Number(latest - refBlock.number || 1n);
      const tsOf = (b: bigint) =>
        (Number(latestBlock.timestamp) - Number(latest - b) * blockTime) * 1000;

      const events: PaymentEvent[] = logs
        .map((l) => ({
          hash: l.transactionHash as `0x${string}`,
          from: l.args.from as `0x${string}`,
          amount: Number(formatUnits(l.args.value ?? 0n, 6)),
          block: l.blockNumber as bigint,
          timestamp: tsOf(l.blockNumber as bigint),
        }))
        .sort((a, b) => Number(b.block - a.block));

      const now = Date.now();
      const buckets = new Array(16).fill(0) as number[];
      const bucketMs = (24 * 3600 * 1000) / 16;
      for (const e of events) {
        const age = now - e.timestamp;
        if (age < 0 || age >= 24 * 3600 * 1000) continue;
        buckets[15 - Math.floor(age / bucketMs)] += e.amount;
      }

      return {
        events,
        volume: events.reduce((s, e) => s + e.amount, 0),
        payers: new Set(events.map((e) => e.from.toLowerCase())).size,
        buckets,
        blockTime,
        latest,
      };
    },
  });
}
