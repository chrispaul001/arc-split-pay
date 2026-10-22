import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useUsdc } from "@/lib/use-usdc";
import { useConnectWallet } from "@/lib/use-connect";
import { AlertTriangle, Copy, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { formatted } = useUsdc();
  const { connect } = useConnectWallet();
  const { disconnect } = useDisconnect();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!mounted) {
          return <div className="h-9 w-32 animate-pulse rounded-full bg-secondary/60" aria-hidden />;
        }

        if (!connected) {
          return (
            <Button size={compact ? "sm" : "lg"} onClick={connect}>
              <Wallet className="size-4" /> Connect Wallet
            </Button>
          );
        }

        return (
          <div className={`flex min-w-0 items-center gap-2 ${compact ? "flex-nowrap whitespace-nowrap" : "flex-wrap"}`}>
            {chain.unsupported && (
              <Button size="sm" variant="secondary" onClick={openChainModal}>
                <AlertTriangle className="size-4 text-mint" /> Switch network
              </Button>
            )}
            <button
              onClick={() => {
                void navigator.clipboard.writeText(account.address);
                toast.success("Address copied");
              }}
              className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-secondary/80"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-mint" />
              <span className="truncate font-mono tabular-nums">{account.displayName}</span>
              <Copy className="size-3 shrink-0 text-muted-foreground" />
            </button>
            <span className="rounded-full bg-primary/15 px-3 py-1.5 text-[11px] font-semibold text-primary tabular-nums">
              {formatted == null
                ? "— USDC"
                : `${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
            </span>
            {!compact && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-[11px] text-muted-foreground hover:text-destructive"
                onClick={() => {
                  disconnect();
                  toast.success("Wallet disconnected");
                }}
              >
                <LogOut className="size-3.5" /> Disconnect
              </Button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
