import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Only the fields the browser may choose. Everything else is fixed server-side.
const bodySchema = z.object({
  destinationAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  appUserId: z.string().max(128).optional(),
  amount: z
    .string()
    .regex(/^\d{1,7}(\.\d{1,2})?$/)
    .optional(),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Circle's Onramp session endpoint. We call the REST API directly instead of
// using @circle-fin/app-kit/server: that SDK pulls in Node-only logging
// (pino/sonic-boom + util.inherits) which crashes the edge worker at import
// time and takes down every route with a 500.
const CIRCLE_SESSIONS_URL = "https://api.circle.com/v1/stablecoinKits/sessions";

export const Route = createFileRoute("/api/onramp/sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["ONRAMP_API_KEY"];
        if (!apiKey) return json({ message: "Card checkout is not configured yet" }, 503);

        let parsed;
        try {
          parsed = bodySchema.safeParse(await request.json());
        } catch {
          return json({ message: "Invalid JSON body" }, 400);
        }
        if (!parsed.success) return json({ message: "Invalid request" }, 400);
        const { destinationAddress, amount } = parsed.data;

        try {
          const referrerDomain = new URL(request.url).hostname;
          const res = await fetch(CIRCLE_SESSIONS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              // userId is derived from the wallet so callers can't impersonate others
              appUserId: destinationAddress.toLowerCase(),
              walletAddress: destinationAddress,
              destinationChain: "Arc_Testnet",
              referrerDomain,
              ...(amount ? { amount, currency: "USD" } : {}),
            }),
          });

          const payload: unknown = await res.json().catch(() => null);
          if (!res.ok) {
            console.error("[onramp] createSession failed", res.status);
            const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
            return json({ message: "Could not start card checkout" }, status);
          }

          const envelope = payload as { data?: unknown } | null;
          const session =
            envelope && typeof envelope === "object" && envelope.data && typeof envelope.data === "object"
              ? envelope.data
              : payload;
          return json(session);
        } catch (e) {
          console.error("[onramp] createSession error", e instanceof Error ? e.message : e);
          return json({ message: "Could not start card checkout" }, 502);
        }
      },
    },
  },
});
