import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MSG_MAX_AGE_MS = 10 * 60 * 1000;

export const signInMessage = (address: string, issuedAt: number) =>
  `Sign in to CoindeccPay\n\nWallet: ${address.toLowerCase()}\nIssued: ${issuedAt}\n\nThis only proves you own this wallet. It costs no gas.`;

async function hmac(value: string) {
  const { createHmac } = await import("crypto");
  const secret = process.env["WALLET_SESSION_SECRET"];
  if (!secret) throw new Error("Server misconfigured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function verifyToken(token: string): Promise<string> {
  const [address, exp, sig] = token.split(".");
  if (!address || !exp || !sig || !Addr.safeParse(address).success) throw new Error("Invalid session");
  if (Number(exp) < Date.now()) throw new Error("Session expired");
  const { timingSafeEqual } = await import("crypto");
  const expected = Buffer.from(await hmac(`${address}.${exp}`));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) throw new Error("Invalid session");
  return address.toLowerCase();
}

export const walletSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ address: Addr, issuedAt: z.number(), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (Math.abs(Date.now() - data.issuedAt) > MSG_MAX_AGE_MS) throw new Error("Sign-in request expired");
    const { verifyMessage } = await import("viem");
    const ok = await verifyMessage({
      address: data.address as `0x${string}`,
      message: signInMessage(data.address, data.issuedAt),
      signature: data.signature as `0x${string}`,
    });
    if (!ok) throw new Error("Signature does not match this wallet");
    const address = data.address.toLowerCase();
    const exp = String(Date.now() + TOKEN_TTL_MS);
    return { token: `${address}.${exp}.${await hmac(`${address}.${exp}`)}` };
  });

export const loadProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("merchant_profiles")
      .select("data, brand")
      .eq("address", address)
      .maybeSingle();
    if (error) throw new Error("Could not load profile");
    return { exists: Boolean(row), json: JSON.stringify({ data: row?.data ?? null, brand: row?.brand ?? null }) };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ token: z.string().max(300), data: z.record(z.string(), z.unknown()), brand: z.record(z.string(), z.unknown()) })
      .refine((v) => JSON.stringify(v).length < 7_000_000, "Profile too large")
      .parse(d),
  )
  .handler(async ({ data }) => {
    const address = await verifyToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("merchant_profiles").upsert(
      { address, data: data.data as never, brand: data.brand as never, updated_at: new Date().toISOString() },
      { onConflict: "address" },
    );
    if (error) throw new Error("Could not save profile");
    return { ok: true };
  });
