import { CheckCircle2, Circle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { explorerTx } from "@/lib/web3";

export type TxStatus = "idle" | "wallet" | "pending" | "confirmed" | "failed";

export type TxStep = {
  key: string;
  label: string;
  description: string;
  status: TxStatus;
  hash?: string | undefined;
  error?: string | undefined;
};

const LABEL: Record<TxStatus, string> = {
  idle: "Waiting",
  wallet: "Awaiting signature",
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

const TONE: Record<TxStatus, string> = {
  idle: "bg-secondary/60 text-muted-foreground",
  wallet: "bg-primary/15 text-primary",
  pending: "bg-primary/15 text-primary",
  confirmed: "bg-mint/15 text-mint",
  failed: "bg-destructive/15 text-destructive",
};

function StatusIcon({ status }: { status: TxStatus }) {
  if (status === "confirmed") return <CheckCircle2 className="size-4 shrink-0 text-mint" />;
  if (status === "failed") return <XCircle className="size-4 shrink-0 text-destructive" />;
  if (status === "pending" || status === "wallet")
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground" />;
}

export function TxProgress({ steps }: { steps: TxStep[] }) {
  return (
    <div className="w-full max-w-full space-y-2 rounded-2xl border border-border bg-secondary/40 p-3 box-border">
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Transaction progress
      </p>
      {steps.map((step) => (
        <div key={step.key} className="min-w-0 rounded-xl bg-background/40 px-3 py-2.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <StatusIcon status={step.status} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{step.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{step.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${TONE[step.status]} ${
                step.status === "confirmed" ? "pulse-emerald" : ""
              }`}
            >
              {LABEL[step.status]}
            </span>
          </div>
          {step.error && (
            <p className="mt-1.5 text-[11px] break-words text-destructive">{step.error}</p>
          )}
          {step.hash && (
            <a
              href={explorerTx(step.hash)}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-primary hover:underline"
            >
              <span className="truncate font-mono tabular-nums">{step.hash}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
