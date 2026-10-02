import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Widget = { close(): void };

const WIDGET_ORIGIN = "https://onramp.arc.io";

/**
 * Fetches an onramp session from the host endpoint and mounts Circle's hosted
 * onramp widget into `container`. The iframe is built here instead of through
 * the Circle browser SDK so no heavy SDK bundle is pulled into the app.
 */
export async function mountOnramp(params: {
  container: HTMLElement;
  destinationAddress: string;
  amount?: string | undefined;
}): Promise<Widget> {
  const res = await fetch("/api/onramp/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appUserId: params.destinationAddress.toLowerCase(),
      destinationAddress: params.destinationAddress,
      ...(params.amount ? { amount: params.amount } : {}),
    }),
  });
  if (!res.ok) {
    const info = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(info?.message ?? `Failed to start card checkout.`);
  }

  const payload = (await res.json()) as { widgetUrl?: string; sessionToken?: string };
  const widgetUrl =
    payload.widgetUrl ??
    (payload.sessionToken
      ? `${WIDGET_ORIGIN}/?sessionToken=${encodeURIComponent(payload.sessionToken)}`
      : undefined);
  if (!widgetUrl) throw new Error("Card checkout session was incomplete");

  // Only ever frame Circle's own widget origin.
  const parsed = new URL(widgetUrl);
  if (parsed.origin !== WIDGET_ORIGIN) throw new Error("Unexpected card checkout address");

  const iframe = document.createElement("iframe");
  iframe.src = parsed.toString();
  iframe.title = "Card checkout";
  iframe.setAttribute("allow", "camera; microphone; clipboard-read; clipboard-write; payment");
  iframe.referrerPolicy = "strict-origin";
  params.container.appendChild(iframe);

  return {
    close() {
      iframe.remove();
    },
  };
}

export function OnrampCheckoutModal({
  destinationAddress,
  amount,
}: {
  destinationAddress: string;
  amount?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<Widget | null>(null);

  const start = useCallback(async () => {
    const container = document.getElementById("onramp-root");
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    setError(null);
    try {
      widgetRef.current = await mountOnramp({ container, destinationAddress, amount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Card checkout is currently unavailable.");
    } finally {
      setLoading(false);
    }
  }, [destinationAddress, amount]);

  useEffect(() => {
    if (!open) {
      widgetRef.current?.close();
      widgetRef.current = null;
      return;
    }
    // wait for the dialog content (and #onramp-root) to render
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [open, start]);

  return (
    <>
      <Button variant="outline" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <CreditCard className="size-4" /> Pay with Card / Fiat
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pay with card</DialogTitle>
            <DialogDescription>Buy USDC on Arc with a card, delivered to your wallet.</DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Starting secure checkout…
            </div>
          )}
          {error && (
            <div className="space-y-3 py-2 text-sm">
              <p className="text-destructive">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => void start()}>
                Try again
              </Button>
            </div>
          )}
          <div id="onramp-root" className="min-h-[560px] w-full [&_iframe]:h-[560px] [&_iframe]:w-full [&_iframe]:rounded-xl [&_iframe]:border-0" />
        </DialogContent>
      </Dialog>
    </>
  );
}
