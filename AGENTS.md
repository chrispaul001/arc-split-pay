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
