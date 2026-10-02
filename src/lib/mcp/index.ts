import { defineMcp } from "@lovable.dev/mcp-js";
import getUsdcBalance from "./tools/get-usdc-balance";
import getTransaction from "./tools/get-transaction";
import recentPayments from "./tools/recent-payments";
import buildPaymentLink from "./tools/build-payment-link";

export default defineMcp({
  name: "coindecc-pay-dashboard",
  title: "Coindecc Pay Dashboard",
  version: "0.1.0",
  instructions:
    "Public read-only tools for CoindeccPay on Arc Testnet: check USDC balances, inspect transactions and split transfers, list recent contract payments, and build shareable checkout links. No merchant account data is exposed.",
  tools: [getUsdcBalance, getTransaction, recentPayments, buildPaymentLink],
});
