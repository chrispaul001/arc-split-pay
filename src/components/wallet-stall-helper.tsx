import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMobileDevice, metaMaskDappLink, metaMaskWakeLink } from "@/lib/wallet-guard";

/** Shown while a wallet step is pending: always offers Cancel; on mobile, after a short stall, offers "Open MetaMask". */
export function WalletStallHelper({ label, onCancel }: { label: string; onCancel: () => void }) {
  // Mobile wallets sleep in the background, so offer the wake link immediately.
  const stalled = true;
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(isMobileDevice()); }, []);

  return (
    <div role="status" aria-live="polite" className="animate-rise space-y-2 rounded-2xl border border-border bg-secondary/50 p-3">
      <div className="flex items-center gap-3">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground">Confirm in your wallet app.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 shrink-0 px-3 text-xs" aria-label="Cancel transaction">
          <X className="size-3.5" /> Cancel
        </Button>
      </div>
      {mobile && stalled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
          <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">No prompt yet? Wake your wallet:</p>
          <Button asChild size="sm" variant="secondary" className="h-8 px-3 text-xs">
            <a href={metaMaskWakeLink()} target="_blank" rel="noopener noreferrer">
              Open MetaMask <ExternalLink className="size-3" />
            </a>
          </Button>
          <a href={metaMaskDappLink()} className="text-[11px] text-primary underline-offset-2 hover:underline">
            Open in MetaMask browser
          </a>
        </div>
      )}
    </div>
  );
}
