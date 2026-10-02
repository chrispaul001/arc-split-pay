import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "build_payment_link",
  title: "Build payment link",
  description: "Create a shareable CoindeccPay checkout URL for an amount and split percentages.",
  inputSchema: {
    amount: z.number().positive().max(10_000_000).describe("Amount to charge."),
    currency: z.string().regex(/^[A-Z]{3,4}$/).default("USD").describe("Currency code, e.g. USD."),
    splits: z.array(z.number().positive().max(100)).min(1).max(10).default([100]).describe("Split percentages summing to 100."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ amount, currency, splits }) => {
    const total = splits.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.001) throw new ToolError("Split percentages must add up to 100.");
    const url = `https://coindeccpay.lovable.app/s/${splits.map((p) => Math.round(p * 100)).join("-")}?amt=${amount}&cur=${currency}&net=arc`;
    return { content: [{ type: "text", text: url }], structuredContent: { url } };
  },
});
