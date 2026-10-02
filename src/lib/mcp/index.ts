import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getUsdcBalance from "./tools/get-usdc-balance";
import getTransaction from "./tools/get-transaction";
import recentPayments from "./tools/recent-payments";
import buildPaymentLink from "./tools/build-payment-link";

// Public project URL (inlined at build time); not a secret.
const supabaseUrl = String(import.meta.env["VITE_SUPABASE_URL"] ?? "https://supabase.invalid").replace(/\/+$/, "");

export default defineMcp({
  name: "coindecc-pay-dashboard",
  title: "Coindecc Pay Dashboard",
  version: "0.1.0",
  instructions:
    "Read-only tools for CoindeccPay on Arc Testnet: check USDC balances, inspect transactions and split transfers, list recent contract payments, and build shareable checkout links. Requires a signed-in CoindeccPay account. No merchant account data is exposed.",
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    acceptedAudiences: "authenticated",
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  }),
  tools: [getUsdcBalance, getTransaction, recentPayments, buildPaymentLink],
});
