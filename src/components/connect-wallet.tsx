import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import { ARC_TESTNET, shortAddress } from "@/lib/web3";
import { Copy, Loader2, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { hasProvider, address, connect, connecting, usdcBalance, wrongNetwork, switchNetwork, disconnect } =
    useWallet();

  const onConnect = async () => {
    try {
      if (!hasProvider) {
        toast.error("MetaMask not detected", { description: "Install MetaMask to connect a wallet." });
        return;
      }
      await connect();
      toast.success("Wallet connected");
    } catch (e) {
      toast.error("Connection failed", { description: (e as Error).message });
    }
  };

  if (!address) {
    return (
      <Button size={compact ? "sm" : "lg"} onClick={onConnect} disabled={connecting}>
        {connecting ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {wrongNetwork && (
        <Button size="sm" variant="secondary" onClick={() => void switchNetwork()}>
          <AlertTriangle className="size-4 text-mint" /> Switch to {ARC_TESTNET.chainName}
        </Button>
      )}
      <button
        onClick={() => {
          void navigator.clipboard.writeText(address);
          toast.success("Address copied");
        }}
        className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-secondary/80"
      >
        <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" />
        <span className="truncate font-mono tabular-nums">{shortAddress(address)}</span>
        <Copy className="size-3 shrink-0 text-muted-foreground" />
      </button>
      <span className="rounded-full bg-primary/15 px-3 py-1.5 text-[11px] font-semibold text-primary tabular-nums">
        {usdcBalance == null ? "— USDC" : `${Number(usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
      </span>
      {!compact && (
        <Button size="sm" variant="secondary" onClick={disconnect}>
          Disconnect
        </Button>
      )}
    </div>
  );
}
