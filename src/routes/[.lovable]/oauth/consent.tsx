import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Search = { authorization_id?: string };
type Details = { id: string; client: string; email: string; scopes: string[] };

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Authorize access · CoindeccPay" },
      { name: "description", content: "Approve or deny an AI assistant's access to your CoindeccPay tools." },
      { property: "og:title", content: "Authorize access · CoindeccPay" },
      { property: "og:description", content: "Approve or deny an AI assistant's access to CoindeccPay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const { authorization_id } = Route.useSearch();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorization_id) return setError("This authorization link is incomplete. Start again from your AI assistant.");
    let alive = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const back = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/auth?redirect=${encodeURIComponent(back)}`);
        return;
      }
      const { data, error: err } = await supabase.auth.oauth.getAuthorizationDetails(authorization_id);
      if (!alive) return;
      if (err || !data) return setError("This authorization request has expired. Start again from your AI assistant.");
      if ("redirect_url" in data && !("authorization_id" in data)) return window.location.replace(data.redirect_url);
      if ("authorization_id" in data) {
        setDetails({
          id: data.authorization_id,
          client: data.client?.name || "An AI assistant",
          email: data.user?.email ?? "",
          scopes: (data.scope ?? "").split(" ").filter(Boolean),
        });
      }
    })();
    return () => { alive = false; };
  }, [authorization_id]);

  const decide = async (approve: boolean) => {
    if (!details) return;
    setBusy(true);
    const { data, error: err } = approve
      ? await supabase.auth.oauth.approveAuthorization(details.id, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(details.id, { skipBrowserRedirect: true });
    if (err || !data?.redirect_url) {
      setBusy(false);
      return setError("We couldn't complete that request. Please try again from your AI assistant.");
    }
    window.location.replace(data.redirect_url);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="glass w-full max-w-sm rounded-3xl px-6 py-7">
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold">Authorization unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Allow {details.client}?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {details.client} wants to use CoindeccPay tools{details.email ? ` as ${details.email}` : ""}: check USDC balances,
              look up Arc transactions, list recent payments and create payment links.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">It can't move funds or change your merchant settings.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
              <Button disabled={busy} onClick={() => decide(true)}>Allow</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
