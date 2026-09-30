import { useCallback, useEffect, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";

/**
 * True when the app runs inside an iframe (the Lovable preview pane, or any
 * embed). Mobile OSes refuse to hand wallet deep links off to an app from
 * inside an iframe, so wallet taps do nothing there.
 */
export function useEmbeddedPreview() {
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    try {
      setEmbedded(window.self !== window.top);
    } catch {
      setEmbedded(true);
    }
  }, []);

  return embedded;
}

/**
 * Single entry point for every "Connect wallet" affordance. Opens RainbowKit
 * normally, and escapes the iframe first when embedded so the wallet app can
 * actually be launched.
 */
export function useConnectWallet() {
  const { openConnectModal } = useConnectModal();
  const embedded = useEmbeddedPreview();

  const connect = useCallback(() => {
    if (embedded) {
      toast.info("Opening CoindeccPay in a new tab so your wallet app can respond.");
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      return;
    }
    openConnectModal?.();
  }, [embedded, openConnectModal]);

  return { connect, embedded, ready: embedded || Boolean(openConnectModal) };
}
