import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { formatUnits } from "viem";
import { COINDECC_PAY_ADDRESS, USDC_ADDRESS, explorerTx } from "@/lib/web3";
import { TRANSFER, arcClient } from "../arc";

export default defineTool({
  name: "list_recent_payments",
  title: "List recent CoindeccPay payments",
  description: "List recent USDC payments into the CoindeccPay contract on Arc Testnet (public on-chain data).",
  inputSchema: { limit: z.number().int().min(1).max(50).default(10).describe("Max payments to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ limit }, ctx) => {
    const client = arcClient();
    let to = await client.getBlockNumber();
    const logs = [];
    for (let i = 0; i < 6 && to > 0n && logs.length < limit && !ctx.signal.aborted; i++) {
      const from = to > 9500n ? to - 9500n : 0n;
      logs.push(...await client.getLogs({ address: USDC_ADDRESS, event: TRANSFER, args: { to: COINDECC_PAY_ADDRESS }, fromBlock: from, toBlock: to }));
      to = from - 1n;
    }
    const payments = logs.sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))).slice(0, limit).map((l) => ({
      hash: l.transactionHash ?? "", payer: l.args.from ?? "", amount: formatUnits(l.args.value ?? 0n, 6),
      blockNumber: (l.blockNumber ?? 0n).toString(), explorer: explorerTx(l.transactionHash ?? ""),
    }));
    return { content: [{ type: "text", text: JSON.stringify(payments) }], structuredContent: { payments } };
  },
});
