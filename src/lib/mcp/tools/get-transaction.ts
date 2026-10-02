import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { decodeEventLog, formatUnits } from "viem";
import { USDC_ADDRESS, explorerTx } from "@/lib/web3";
import { TRANSFER, arcClient } from "../arc";

export default defineTool({
  name: "get_transaction",
  title: "Get transaction",
  description: "Look up an Arc Testnet transaction and list its USDC transfers (including CoindeccPay split legs).",
  inputSchema: { hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).describe("Transaction hash.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ hash }) => {
    const client = arcClient();
    const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
    if (!receipt) throw new ToolError("Transaction not found on Arc Testnet.");
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    const transfers = receipt.logs
      .filter((l) => l.address.toLowerCase() === USDC_ADDRESS.toLowerCase())
      .flatMap((l) => {
        try {
          const e = decodeEventLog({ abi: [TRANSFER], data: l.data, topics: l.topics });
          return [{ from: e.args.from, to: e.args.to, amount: formatUnits(e.args.value, 6) }];
        } catch { return []; }
      });
    const result = {
      hash, status: receipt.status, from: receipt.from, to: receipt.to ?? null,
      blockNumber: receipt.blockNumber.toString(),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      explorer: explorerTx(hash), transfers,
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
