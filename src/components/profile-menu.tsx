import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { useBrand } from "@/lib/brand";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useUsdc } from "@/lib/use-usdc";
import { toast } from "sonner";
import { ChevronDown, Copy, LogOut, Settings, Users, Wallet } from "lucide-react";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function ProfileMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { avatar, logo, setImage, businessName, initials } = useBrand();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { formatted } = useUsdc();
  const [profileOpen, setProfileOpen] = useState(false);

  const copyWallet = () => {
    if (!address) return;
    void navigator.clipboard?.writeText(address);
    toast.success("Wallet address copied", { description: "Connected Arc wallet." });
  };

  const signOut = () => {
    if (isConnected) {
      disconnect();
      toast.success("Wallet disconnected", { description: "Your Arc wallet was disconnected." });
    } else {
      toast("Signed out", { description: "Demo session ended." });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Open merchant menu"
            className="motion-press group flex items-center gap-2 rounded-2xl bg-secondary/50 py-1 pr-2 pl-1 hover:bg-secondary/80 data-[state=open]:bg-secondary/90"
          >
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/20 font-display text-xs font-bold text-primary">
              {isConnected ? (
                avatar ? (
                  <img src={avatar} alt="Merchant avatar" className="size-full object-cover" />
                ) : (
                  initials
                )
              ) : (
                <Wallet className="size-4" />
              )}
            </span>
            <span className="hidden text-left text-xs leading-tight sm:block">
              {isConnected ? (
                <>
                  <span className="block max-w-[8rem] truncate font-semibold">{businessName}</span>
                  <span className="block font-mono text-muted-foreground tabular-nums">
                    {address ? short(address) : "Merchant"}
                  </span>
                </>
              ) : (
                <>
                  <span className="block font-semibold">Connect Wallet</span>
                  <span className="block text-muted-foreground">Not connected</span>
                </>
              )}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="glass w-[min(18rem,calc(100vw-2rem))] rounded-2xl border-border p-1.5"
        >
          <DropdownMenuLabel className="px-2 py-2">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/20 font-display text-xs font-bold text-primary">
                {isConnected ? (
                  avatar ? (
                    <img src={avatar} alt="" className="size-full object-cover" />
                  ) : (
                    initials
                  )
                ) : (
                  <Wallet className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {isConnected ? businessName : "Guest merchant"}
                </span>
                <span className="block truncate text-[11px] font-normal text-muted-foreground">
                  {isConnected ? `Connected · ${chain?.name ?? "Arc"}` : "No wallet connected"}
                </span>
              </span>
            </span>
          </DropdownMenuLabel>

          {isConnected && address ? (
            <div className="mx-1 mt-1 rounded-xl bg-secondary/60 p-2.5">
              <p className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                <span className="pulse-dot size-1.5 rounded-full bg-mint" />
                Connected {chain?.name ?? "Arc"} wallet
              </p>
              <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="truncate font-mono text-[11px] tabular-nums">{address}</span>
                <button
                  onClick={copyWallet}
                  aria-label="Copy wallet address"
                  className="motion-press shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">USDC balance</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatted == null
                    ? "—"
                    : `${Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-1 mt-1 rounded-xl bg-secondary/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">
                Connect a wallet to see your address, USDC balance and network here.
              </p>
              <Button size="sm" className="mt-2 w-full" onClick={() => openConnectModal?.()}>
                <Wallet className="size-4" /> Connect Wallet
              </Button>
            </div>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 rounded-xl transition-transform duration-200 focus:translate-x-0.5" onSelect={() => setProfileOpen(true)}>
            <Users className="size-4" /> Merchant profile & branding
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-xl transition-transform duration-200 focus:translate-x-0.5"
            onSelect={() => toast("Team access", { description: "3 members · 1 pending invite." })}
          >
            <Users className="size-4" /> Team access
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 rounded-xl transition-transform duration-200 focus:translate-x-0.5" onSelect={onOpenSettings}>
            <Settings className="size-4" /> Account settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 rounded-xl text-destructive focus:text-destructive"
            onSelect={signOut}
          >
            <LogOut className="size-4" /> {isConnected ? "Disconnect wallet" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="glass w-[calc(100vw-2rem)] max-w-md rounded-3xl px-4 py-5 sm:px-6">
          <DialogHeader>
            <DialogTitle>Merchant profile & branding</DialogTitle>
            <DialogDescription className="break-words">
              Uploaded images apply instantly across the header, checkout widget and receipts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload
              label="Change profile avatar"
              value={avatar}
              round
              onChange={(v) => setImage("avatar", v)}
            />
            <ImageUpload label="Upload custom logo" value={logo} onChange={(v) => setImage("logo", v)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
