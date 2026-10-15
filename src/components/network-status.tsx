import { useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { arcTestnet } from "@/lib/web3";

/** True when a wallet is connected on any chain other than Arc. */
export function useWrongNetwork() {
  const { address, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const wrong = Boolean(address) && chainId != null && chainId !== arcTestnet.id;
  const switchToArc = async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
      toast.success("Switched to Arc Network");
      return true;
    } catch {
      toast.error("Network not switched", { description: "Approve the switch to Arc Network in your wallet to continue." });
      return false;
    }
  };
  return { wrong, switchToArc, switching: isPending };
}

/** Live network pill: green on Arc, amber "Switch to Arc" button otherwise. Auto-prompts once per wrong chain. */
export function NetworkStatus({ className = "" }: { className?: string }) {
  const { chainId } = useAccount();
  const { wrong, switchToArc, switching } = useWrongNetwork();
  const prompted = useRef<number | null>(null);

  useEffect(() => {
    if (!wrong || chainId == null || prompted.current === chainId) return;
    prompted.current = chainId;
    void switchToArc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrong, chainId]);

  if (wrong)
    return (
      <button
        onClick={() => void switchToArc()}
        disabled={switching}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[11px] font-semibold text-destructive ${className}`}
      >
        {switching ? <Loader2 className="size-3 animate-spin" /> : <AlertTriangle className="size-3" />}
        Wrong network · Switch to Arc
      </button>
    );

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold ${className}`}>
      <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" />
      Arc Network · USDC Gas
    </span>
  );
}
