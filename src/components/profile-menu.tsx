import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TeamAccessDialog } from "@/components/team-access";
import { useSaveGate } from "@/components/guest-gate";
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
import { useConnectWallet } from "@/lib/use-connect";
import { toast } from "sonner";
import { ChevronDown, Copy, LogOut, Settings, Users, Wallet } from "lucide-react";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function ProfileMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { avatar, logo, setImage, businessName, initials } = useBrand();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect: connectWallet } = useConnectWallet();
  const [profileOpen, setProfileOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState<string | null>(avatar);
  const [draftLogo, setDraftLogo] = useState<string | null>(logo);
  const canSave = useSaveGate();

  useEffect(() => {
    if (menuOpen) {
      setBackdropVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setBackdropVisible(false), 200);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  useEffect(() => {
    if (profileOpen) {
      setDraftAvatar(avatar);
      setDraftLogo(logo);
    }
  }, [profileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBranding = () => {
    if (!canSave()) return;
    setImage("avatar", draftAvatar);
    setImage("logo", draftLogo);
    setProfileOpen(false);
    toast.success("Branding saved");
  };

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
      {backdropVisible && createPortal(
        <div
          className="wallet-menu-backdrop"
          data-state={menuOpen ? "open" : "closed"}
          aria-hidden="true"
          onPointerDown={(event) => {
            event.preventDefault();
            setMenuOpen(false);
          }}
        />,
        document.body,
      )}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            aria-label="Open merchant menu"
            className="group h-auto overflow-visible gap-2 rounded-2xl bg-secondary/50 py-1 pr-2 pl-1 hover:bg-secondary/80 data-[state=open]:bg-secondary/90"
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
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          aria-label="Merchant wallet menu"
          className="wallet-menu-surface w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-2"
        >
          <div className="wallet-menu-handle" aria-hidden="true"><span /></div>
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
                {isConnected ? (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                    <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-mint" />
                    Connected · {chain?.name ?? "Arc Network Testnet"}
                  </span>
                ) : (
                  <span className="block truncate text-[11px] font-normal text-muted-foreground">
                    No wallet connected
                  </span>
                )}
              </span>
            </span>
          </DropdownMenuLabel>

          {isConnected && address ? (
            <div className="mx-1 mt-1 rounded-xl bg-secondary/60 p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="truncate font-mono text-[11px] tabular-nums">{address}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyWallet}
                  aria-label="Copy wallet address"
                  className="motion-press shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-1 mt-1 rounded-xl bg-secondary/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">
                Connect a wallet to see your address, USDC balance and network here.
              </p>
              <Button size="sm" className="mt-2 w-full" onClick={connectWallet}>
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
            onSelect={() => setTeamOpen(true)}
          >
            <Users className="size-4" /> Team access
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 rounded-xl transition-transform duration-200 focus:translate-x-0.5" onSelect={onOpenSettings}>
            <Settings className="size-4" /> Account settings
          </DropdownMenuItem>
          {isConnected && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 rounded-xl text-muted-foreground transition-colors focus:text-destructive"
                onSelect={signOut}
              >
                <LogOut className="size-4" /> Disconnect wallet
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="glass w-[calc(100vw-2.5rem)] max-w-md rounded-3xl px-5 pt-6 sm:px-6">
          <DialogHeader>
            <DialogTitle>Merchant profile & branding</DialogTitle>
            <DialogDescription className="break-words">
              Uploaded images apply instantly across the header, checkout widget and receipts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload
              label="Change profile avatar"
              value={draftAvatar}
              round
              onChange={setDraftAvatar}
            />
            <ImageUpload label="Upload custom logo" value={draftLogo} onChange={setDraftLogo} />
            {!isConnected && (
              <p className="rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                Guest preview — connect your wallet to save changes.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button onClick={saveBranding}>Save changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TeamAccessDialog open={teamOpen} onOpenChange={setTeamOpen} />
    </>
  );
}
