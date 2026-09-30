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

- Normalize all browser-persisted profile and merchant data at read time because older or malformed values must never crash app startup.

- Merchant data is keyed by wallet address in the `merchant_profiles` table, reached only via server functions that check a wallet-signed session token (HMAC with WALLET_SESSION_SECRET); localStorage is just an offline cache. Why: anyone can type an address, so ownership must be proven.
- One `MerchantProvider` (in the dashboard route) holds merchant state and the live on-chain payment listener. Why: a single sync source avoids duplicate saves and duplicate listeners.
- The root error screen hard-reloads on retry and only clears `coindecc*` local data during emergency recovery. Why: failed mobile module imports and malformed caches must be recoverable without deleting unrelated browser data.
- Vite preloads TanStack Router core, `isServer`, SSR client, React Router, and Seroval modules. Why: late discovery forces a preview reload that can strand mobile clients behind the proxy.
- The dashboard (all wallet/RainbowKit/Wagmi code) lives in `src/components/dashboard-app.tsx` and is lazy-loaded inside `<ClientOnly>` from `src/routes/index.tsx`; never import wallet modules from a route or `__root`. Why: the MetaMask SDK crashes the edge server at import time, returning 500 on every page.
