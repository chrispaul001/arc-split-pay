# Standardize payment notifications

## Changes
- Centralize payment notification copy so foreground toasts, the notification center, background push, and service-worker fallback use the same wording.
- Set every incoming payment title to exactly `Payment Received!`.
- Use concise direct-payment and split-link bodies without emojis or redundant CoindeccPay branding.
- Normalize previously saved payment notifications when profiles load, so old emoji or inconsistent titles do not remain visible.
- Keep outgoing transaction confirmations distinct because they are not received-payment alerts.

## Verification
- Scan the full app for obsolete emoji titles, `from CoindeccPay`, and inconsistent incoming-payment titles.
- Run the relevant automated tests and confirm the preview build is healthy.

## Technical details
- Define shared browser-safe formatting helpers for amount, sender abbreviation, title, and direct/split body variants.
- Reuse those helpers in frontend event ingestion and backend FCM payload construction.
- Give data-only service-worker notifications the same exact fallback title.
