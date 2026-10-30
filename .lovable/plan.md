# Make the Settings page look professional

## What feels off today (my honest take: about 65/100)
- Everything sits in one long card: name, wallet, webhook, currency, alerts, switches and support all look equally important.
- The green "Connected to Arc" badge shows even when no wallet is connected, which looks misleading.
- "Sandbox mode" contradicts the app, which already runs only on Arc Testnet.
- "Save changes" sits at the very bottom, there's no hint you have unsaved edits, and no way to undo them.
- Support uses a Gmail address next to the brand, which reads less like a business.
- The form is narrow on desktop and leaves a big empty area beside it.

## What I'll change (layout and look only; saving and wallet logic stay the same)
1. **Grouped sections**, each in its own card with a title, short description and icon:
   - Business profile: business name, settlement wallet (+ "Use connected wallet", copy button, wallet check mark when valid).
   - Payments: default currency (locked USDC with the existing helper text), auto-split on receipt.
   - Notifications: push alerts, email receipts.
   - Developers: webhook URL with a "Test format" check and a copy button.
   - Network: read-only Arc Testnet card (chain ID, explorer link) replacing the sandbox switch.
   - Help & support: a quieter footer card.
2. **Desktop layout:** a left section menu (sticky) that jumps to each section; on phones, sections stack with a small pill bar at the top.
3. **Honest status badge:** green "Connected · Arc Testnet" only when a wallet is connected, otherwise a neutral "Wallet not connected" with a Connect button.
4. **Save bar:** a sticky bottom bar appears only when something changed, with "Discard" and "Save changes", plus a saving spinner and a "Saved" confirmation.
5. **Polish:** consistent spacing, aligned switch rows with dividers instead of grey boxes, clear error text under fields, and smooth reveal animation per section.

## Question for you
The support email is coindeccpay@gmail.com. If you have a business address (like support@coindecc...), send it and I'll use it; otherwise I'll keep Gmail.

## Technical notes
- Rewrite `SettingsView` in `src/components/panels.tsx`; keep `useMerchantStore`, `ensureSession`, validation and `update()` unchanged.
- Remove only the sandbox switch from the UI; keep stored `sandboxMode` value untouched for compatibility.
- Dirty state = compare form values with the hydrated profile.
- Use existing tokens/glass styles; verify desktop and mobile in light and dark mode with Playwright.
