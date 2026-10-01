import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyToken } from "@/lib/profile.functions";

const Hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const Rec = z
  .object({ hash: Hash, amount: z.number(), timestamp: z.number(), kind: z.enum(["payment", "split", "stream"]), from: z.string().max(64) })
  .passthrough();

/** Full wallet-scoped history, newest first. */
export const loadTxHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await supabaseAdmin
        .from("wallet_transactions")
        .select("record")
        .eq("address", address)
        .order("tx_time", { ascending: false })
        .range(from, from + 999);
      if (error) throw new Error("Could not load history");
      out.push(...(rows ?? []).map((r) => r.record));
      if (!rows || rows.length < 1000) break;
    }
    return { json: JSON.stringify(out) };
  });

export const saveTxHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(300), records: z.array(Rec).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    if (!data.records.length) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("wallet_transactions").upsert(
      data.records.map((r) => ({
        address,
        hash: r.hash.toLowerCase(),
        record: r as never,
        tx_time: new Date(r.timestamp || Date.now()).toISOString(),
      })),
      { onConflict: "address,hash" },
    );
    if (error) throw new Error("Could not save history");
    return { ok: true };
  });
