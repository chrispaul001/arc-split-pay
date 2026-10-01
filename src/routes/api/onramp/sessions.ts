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
          const { createAppServerKit } = await import("@circle-fin/app-kit/server");
          const referrerDomain = new URL(request.url).hostname;
          const server = createAppServerKit({ onramp: { apiKey, referrerDomain } });
          const session = await server.onramp.createSession({
            // userId is derived from the wallet so callers can't impersonate others
            appUserId: destinationAddress.toLowerCase(),
            destinationAddress,
            destinationChain: "Arc_Testnet",
            assets: { tokens: ["USDC"] },
            ...(amount ? { amount, currency: "USD" } : {}),
          });
          return json(session);
        } catch (e) {
          const err = e as { type?: string; message?: string };
          console.error("[onramp] createSession failed", err?.type, err?.message);
          const status = err?.type === "INPUT" ? 400 : err?.type === "RATE_LIMIT" ? 429 : 502;
          return json({ message: "Could not start card checkout" }, status);
        }
      },
    },
  },
});
