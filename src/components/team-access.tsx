import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useSaveGate } from "@/components/guest-gate";
import { randomId, timeAgo, useMerchantStore, type TeamRole } from "@/lib/merchant-store";
import { useBrand } from "@/lib/brand";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: TeamRole[] = ["Admin", "Developer", "Viewer"];
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function TeamAccessDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, update, notify, address, isConnected } = useMerchantStore();
  const { businessName } = useBrand();
  const canSave = useSaveGate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Developer");
  const [error, setError] = useState("");

  const team = isConnected ? data.team : [];
  const pending = team.length;

  const invite = () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError("Enter a valid email address.");
    if (team.some((m) => m.email === e)) return setError("That email is already invited.");
    setError("");
    if (!canSave()) return;
    update((p) => ({
      ...p,
      team: [{ id: randomId(), email: e, role, status: "Pending", createdAt: Date.now() }, ...p.team],
    }));
    notify({ kind: "system", title: "Team invite sent", body: `${e} invited as ${role}` });
    setEmail("");
    toast.success("Invite added", { description: `${e} · ${role}` });
  };

  const remove = (id: string) => {
    if (!canSave()) return;
    update((p) => ({ ...p, team: p.team.filter((m) => m.id !== id) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass w-[calc(100vw-2.5rem)] max-w-md rounded-3xl px-5 pt-6 sm:px-6">
        <DialogHeader>
          <DialogTitle>Team access</DialogTitle>
          <DialogDescription>
            {1 + pending} member{pending ? "s" : ""} · {pending} pending invite{pending === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 p-3">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Crown className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{isConnected ? businessName : "Primary account"}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {address ? short(address) : "No wallet connected"}
              </p>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">Owner</span>
          </li>
          {team.map((m) => (
            <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary/50 p-3">
              <span className="grid size-8 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <Mail className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.email}</p>
                <p className="text-[11px] text-muted-foreground">{m.role} · Pending · {timeAgo(m.createdAt)}</p>
              </div>
              <button
                aria-label={`Remove ${m.email}`}
                onClick={() => remove(m.id)}
                className="motion-press rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Invite a teammate</Label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
              className={`bg-background/40 ${error ? "border-destructive" : ""}`}
            />
            <select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="rounded-xl border border-input bg-background/40 px-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={invite}>
            <UserPlus className="size-4" /> Send invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
