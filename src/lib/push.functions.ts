import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyToken } from "@/lib/profile.functions";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const Session = z.string().max(300);

export const registerPushToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Session, pushToken: z.string().min(20).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert({ token: data.pushToken, address, updated_at: new Date().toISOString() }, { onConflict: "token" });
    if (error) throw new Error("Could not save device");
    return { ok: true };
  });

/**
 * Sends a push for a confirmed USDC transfer to every device of the signed-in wallet.
 * The transfer is re-read from Arc so the alert can't be forged: amount and sender come from the chain.
 */
export const sendTxPush = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: Session, hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), origin: z.string().url().max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !fcmKey) return { sent: 0 };

    const { arcClient, TRANSFER } = await import("@/lib/mcp/arc");
    const { USDC_ADDRESS, explorerTx } = await import("@/lib/web3");
    const { decodeEventLog, formatUnits } = await import("viem");
    const receipt = await arcClient().getTransactionReceipt({ hash: data.hash as `0x${string}` });
    if (receipt.status !== "success") return { sent: 0 };
    const legs = receipt.logs.flatMap((log) => {
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) return [];
      try {
        const d = decodeEventLog({ abi: [TRANSFER], data: log.data, topics: log.topics });
        const a = d.args as { from: string; to: string; value: bigint };
        return [{ from: a.from, to: a.to, amount: Number(formatUnits(a.value, 6)) }];
      } catch { return []; }
    });
    const incoming = legs.filter((l) => l.to.toLowerCase() === address && l.from.toLowerCase() !== address);
    if (!incoming.length) return { sent: 0 };
    const amount = incoming.reduce((s, l) => s + l.amount, 0);
    const sender = incoming[0]!.from;
    const isSplit = legs.length > 1;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("token").eq("address", address);
    if (!rows?.length) return { sent: 0 };

    const amt = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    const title = "Payment received";
    const from = `${sender.slice(0, 6)}…${sender.slice(-4)}`;
    const body = isSplit
      ? `Your split link received ${amt} USDC from ${from} on Arc Network.`
      : `${amt} USDC received from ${from} on Arc Network.`;
    const explorer = explorerTx(data.hash);
    const appUrl = `${data.origin}/?tab=transactions&tx=${data.hash}`;
    let sent = 0;
    for (const { token } of rows) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            // `notification` lets iOS home-screen apps show the alert natively while backgrounded.
            notification: { title, body },
            data: { title, body, hash: data.hash, amount: String(amount), sender, explorer, url: explorer },
            webpush: {
              headers: { Urgency: "high", TTL: "86400" },
              notification: { title, body, icon: `${data.origin}/icon-192.png`, badge: `${data.origin}/icon-192.png`, tag: data.hash },
              fcm_options: { link: explorer },
            },
          },
        }),
      });
      if (res.ok) { sent++; continue; }
      const text = await res.text();
      console.error(`FCM send failed [${res.status}]: ${text}`);
      if (res.status === 404 || (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT/.test(text)))
        await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    }
    return { sent };
  });

export const removePushToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Session, pushToken: z.string().min(20).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_tokens").delete().eq("token", data.pushToken).eq("address", address);
    return { ok: true };
  });
