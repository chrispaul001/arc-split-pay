import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { formatUnits } from "viem";
import { ERC20_ABI, USDC_ADDRESS } from "@/lib/web3";
import { ADDR, arcClient } from "../arc";

export default defineTool({
  name: "get_usdc_balance",
  title: "Get USDC balance",
  description: "Read the public USDC balance of a wallet address on Arc Testnet.",
  inputSchema: { address: z.string().regex(ADDR).describe("0x wallet address.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ address }) => {
    try {
      const raw = await arcClient().readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }) as bigint;
      const balance = formatUnits(raw, 6);
      return { content: [{ type: "text", text: `${balance} USDC` }], structuredContent: { address, balance, token: "USDC", chain: "Arc Testnet" } };
    } catch {
      throw new ToolError("Could not read balance from Arc Testnet.");
    }
  },
});
