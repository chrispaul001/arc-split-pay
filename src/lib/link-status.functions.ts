import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public, read-only check used by buyer checkout. Returns only the link's status —
 * never names, amounts, parties or any other merchant data.
 */
export const getLinkStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      merchant: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      link: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ status: "active" | "inactive" }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("merchant_profiles")
      .select("data")
      .eq("address", data.merchant.toLowerCase())
      .maybeSingle();
    if (error) throw new Error("Could not verify this payment link");
    const links = (row?.data as { links?: unknown } | null)?.links;
    const found = Array.isArray(links)
      ? links.find((l): l is { id: string; status?: string } => !!l && typeof l === "object" && (l as { id?: unknown }).id === data.link)
      : undefined;
    // Unknown or deleted links are treated as inactive: fail closed.
    return { status: found?.status === "Active" ? "active" : "inactive" };
  });

export function withLinkParams(url: string, linkId: string, merchant: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("lnk", linkId);
    u.searchParams.set("m", merchant.toLowerCase());
    return u.toString();
  } catch {
    return url;
  }
}
