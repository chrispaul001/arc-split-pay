import { beforeAll, describe, expect, it } from "vitest";

// Runs against the dev server (or BASE_URL). Skips cleanly when nothing is listening.
const BASE = process.env["BASE_URL"] ?? "http://127.0.0.1:8080";
let up = false;
beforeAll(async () => { up = await fetch(BASE).then(() => true, (e) => { console.log("UNREACHABLE", String(e), e?.cause); return false; }); });

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims: object) => `${b64({ alg: "RS256", typ: "JWT", kid: "revoked-key" })}.${b64(claims)}.${"x".repeat(43)}`;
const now = Math.floor(Date.now() / 1000);
const TOOLS = ["get_usdc_balance", "get_transaction", "recent_payments", "build_payment_link"];

const rpc = (method: string, params: object, token?: string) =>
  fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

const BAD_TOKENS: Record<string, string | undefined> = {
  "no token": undefined,
  "garbage token": "invalid-token",
  "expired token": jwt({ sub: "u", aud: "authenticated", client_id: "c", exp: now - 3600, iat: now - 7200 }),
  "revoked / unknown-key token": jwt({ sub: "u", aud: "authenticated", client_id: "c", exp: now + 3600, iat: now }),
};

describe("MCP server rejects unauthenticated callers", () => {
  for (const [name, token] of Object.entries(BAD_TOKENS)) {
    it(`tools/list with ${name} → 401`, async (ctx) => {
      if (!up) return ctx.skip();
      const res = await rpc("tools/list", {}, token);
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate") ?? "").toMatch(/Bearer/i);
    });
    for (const tool of TOOLS) {
      it(`tools/call ${tool} with ${name} → 401`, async (ctx) => {
        if (!up) return ctx.skip();
        const res = await rpc("tools/call", { name: tool, arguments: {} }, token);
        expect(res.status).toBe(401);
      });
    }
  }
});

describe("public navigation and buyer checkout stay open", () => {
  for (const path of ["/", "/s/5000-5000?amt=10&cur=USD&net=arc", "/checkout/5000-5000?amt=10", "/auth"]) {
    it(`GET ${path} is reachable without login`, async (ctx) => {
      if (!up) return ctx.skip();
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      expect(res.status).toBeLessThan(400);
    });
  }
  it("card checkout session endpoint validates input instead of demanding login", async (ctx) => {
    if (!up) return ctx.skip();
    const res = await fetch(`${BASE}/api/onramp/sessions`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(res.status).not.toBe(401);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
  it("OAuth protected-resource metadata is public", async (ctx) => {
    if (!up) return ctx.skip();
    expect((await fetch(`${BASE}/.well-known/oauth-protected-resource`)).status).toBe(200);
  });
});
