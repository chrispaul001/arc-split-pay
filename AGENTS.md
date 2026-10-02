<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Normalize cached profile/merchant data on read to prevent startup crashes.
- Merchant data (`merchant_profiles`) and wallet history (`wallet_transactions`) are keyed by wallet, reached only via server fns checking a wallet-signed HMAC token; localStorage is an offline cache. Why: ownership must be proven.
- Transactions merge saved history, local labels and wallet + CoindeccPay USDC Transfer logs by hash; scanned records are persisted, and overview settlement analytics derive from that same wallet history. Why: live analytics and history must agree and survive day changes.
- One `MerchantProvider` holds merchant state and the payment listener; it verifies queued checkout hashes and dedupes alerts. Why: single sync source; cross-tab payments.
- Error retry hard-reloads; recovery clears only `coindecc*` data.
- Preload router/SSR deps to avoid forced mobile preview reloads.
- Wallet/RainbowKit/Wagmi code lives in `src/components/dashboard-app.tsx`, lazy-loaded in `<ClientOnly>`; never import wallet modules from a route or `__root`. Why: MetaMask SDK crashes the edge server.
- "Connect wallet" always uses `useConnectWallet()`, never `useConnectModal`. Why: iframes block wallet deep links.
- `src/lib/wagmi.ts` uses HTTPS universal links and hides injected-only wallets without `window.ethereum`. Why: otherwise taps fail silently.
- The MCP server requires OAuth via Lovable Cloud auth (consent page at `/.lovable/oauth/consent`, sign-in at `/auth`); tools stay read-only over public chain data. Why: published MCP endpoints must not be callable anonymously.
- Security checks live in tests/ (vitest, `bun run test`); endpoint tests hit TEST_BASE_URL (default dev server). Why: auth gates must be re-verified on every change.
