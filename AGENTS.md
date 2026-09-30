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

- Normalize cached profile and merchant data on read to prevent startup crashes.

- Merchant data is keyed by wallet address in the `merchant_profiles` table, reached only via server functions that check a wallet-signed session token (HMAC with WALLET_SESSION_SECRET); localStorage is just an offline cache. Why: anyone can type an address, so ownership must be proven.
- One `MerchantProvider` (in the dashboard route) holds merchant state and the live on-chain payment listener. Why: a single sync source avoids duplicate saves and duplicate listeners.
- Error retry hard-reloads; emergency recovery clears only `coindecc*` data to preserve unrelated browser data.
- Preload router/SSR dependencies to avoid forced mobile preview reloads.
- The dashboard (all wallet/RainbowKit/Wagmi code) lives in `src/components/dashboard-app.tsx` and is lazy-loaded inside `<ClientOnly>` from `src/routes/index.tsx`; never import wallet modules from a route or `__root`. Why: the MetaMask SDK crashes the edge server at import time, returning 500 on every page.
- Every "Connect wallet" affordance calls `useConnectWallet()` from `src/lib/use-connect.ts`, never `useConnectModal` directly. Why: inside an iframe the OS blocks wallet deep links, so the hook must escape to a top-level tab first.
- Mobile wallet entries in `src/lib/wagmi.ts` override RainbowKit's custom URI schemes with HTTPS universal links, and injected-only entries are hidden when `window.ethereum` is absent. Why: custom schemes and missing providers fail silently, making taps look dead.
- Confirmed checkouts queue wallet-scoped payment hashes; `MerchantProvider` verifies receipts and deduplicates alerts. Why: checkout links lack the dashboard provider and cross-tab payments must still appear.
