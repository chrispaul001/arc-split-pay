import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function useWalletGate() {
  const { isConnected } = useAccount();
  return isConnected;
}

/** Returns a guard: true when connected, otherwise shows a "Connect wallet to save changes" toast. */
export function useSaveGate() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  return () => {
    if (isConnected) return true;
    toast("Connect wallet to save changes", {
      description: "You can browse freely — saving needs a connected wallet.",
      action: { label: "Connect", onClick: () => openConnectModal?.() },
    });
    return false;
  };
}

export function GuestEmpty({
  title = "No wallet connected",
  description,
}: {
  title?: string;
  description: string;
}) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-10 sm:px-5">
      <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Wallet className="size-6" />
        </span>
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-sm text-xs break-words text-muted-foreground">{description}</p>
        <Button size="sm" className="motion-press" onClick={() => openConnectModal?.()}>
          <Wallet className="size-4" /> Connect Wallet
        </Button>
      </div>
    </div>
  );
}

export function GuestBanner({ message }: { message: string }) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-3">
      <p className="min-w-0 text-xs break-words text-muted-foreground">{message}</p>
      <Button size="sm" className="motion-press shrink-0" onClick={() => openConnectModal?.()}>
        <Wallet className="size-4" /> Connect
      </Button>
    </div>
  );
}
