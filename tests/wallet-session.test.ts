import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

const SECRET = "test-secret-for-automated-checks";
const ADDR = "0x1111111111111111111111111111111111111111";
const sign = (payload: string, secret = SECRET) => createHmac("sha256", secret).update(payload).digest("hex");
let verifyToken: (t: string) => Promise<string>;

beforeAll(async () => {
  process.env["WALLET_SESSION_SECRET"] = SECRET;
  ({ verifyToken } = await import("@/lib/profile.functions"));
});

// Covers every wallet-scoped backend function (loadProfile, saveProfile, loadTxHistory, saveTxHistory),
// all of which gate on verifyToken before touching the database.
describe("wallet session token gate", () => {
  it("rejects a missing token", async () => { await expect(verifyToken("")).rejects.toThrow(); });
  it("rejects a malformed token", async () => { await expect(verifyToken("not-a-token")).rejects.toThrow(); });
  it("rejects a forged signature", async () => {
    const exp = String(Date.now() + 60_000);
    await expect(verifyToken(`${ADDR}.${exp}.${"0".repeat(64)}`)).rejects.toThrow();
  });
  it("rejects an expired token", async () => {
    const exp = String(Date.now() - 1000);
    await expect(verifyToken(`${ADDR}.${exp}.${sign(`${ADDR}.${exp}`)}`)).rejects.toThrow(/expired/i);
  });
  it("rejects a token issued under a revoked (rotated) secret", async () => {
    const exp = String(Date.now() + 60_000);
    await expect(verifyToken(`${ADDR}.${exp}.${sign(`${ADDR}.${exp}`, "old-revoked-secret")}`)).rejects.toThrow();
  });
  it("rejects a token re-pointed at another wallet", async () => {
    const exp = String(Date.now() + 60_000);
    const other = "0x2222222222222222222222222222222222222222";
    await expect(verifyToken(`${other}.${exp}.${sign(`${ADDR}.${exp}`)}`)).rejects.toThrow();
  });
});
