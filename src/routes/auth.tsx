import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeRedirect } from "@/lib/safe-redirect";

type Search = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in · CoindeccPay" },
      { name: "description", content: "Sign in to CoindeccPay to authorize AI assistants to use your CoindeccPay tools." },
      { property: "og:title", content: "Sign in · CoindeccPay" },
      { property: "og:description", content: "Sign in to CoindeccPay to authorize AI assistants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safeRedirect(redirect);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const go = () => window.location.replace(target);
    void supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    return () => data.subscription.unsubscribe();
  }, [target]);

  const google = async () => {
    setBusy(true);
    sessionStorage.setItem("coindecc-auth-redirect", target);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
    });
    if ("error" in res && res.error) {
      toast.error("Google sign-in couldn't be completed. Please try again.");
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) { toast.error("Enter your email and a password of at least 8 characters."); return; }
    setBusy(true);
    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` } });
    setBusy(false);
    if (error) { toast.error(mode === "signin" ? "Those details didn't match an account." : "We couldn't create that account. Please try again."); return; }
    if (mode === "signup") toast.success("Check your inbox to confirm your email, then sign in.");
  };

  return (
    <main className="app-gradient grid min-h-screen place-items-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-3xl px-6 py-7">
        <h1 className="font-display text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to let an AI assistant use your CoindeccPay tools.</p>
        <Button className="mt-6 w-full" variant="outline" onClick={google} disabled={busy}>Continue with Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" autoComplete="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <button type="button" className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
