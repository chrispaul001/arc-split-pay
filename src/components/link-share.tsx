import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

/**
 * Copy a payment link and confirm with a brief, polished toast.
 */
export function copyPaymentLink(url: string) {
  const fail = () =>
    toast.error("Couldn't copy the link", {
      description: "Long-press or highlight the link to copy it.",
    });
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Payment link copied!"),
      fail,
    );
  } else {
    fail();
  }
}

/**
 * URL field with a dedicated copy icon button. Truncates long URLs cleanly
 * and flips to a check mark for a moment after copying.
 */
export function LinkUrlField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
      <p className="min-w-0 flex-1 truncate font-mono text-[11px] break-all text-muted-foreground">
        {url}
      </p>
      <button
        type="button"
        aria-label="Copy payment link"
        onClick={() => {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(
              () => copyPaymentLink(url),
              () => copyPaymentLink(url),
            );
          } else {
            copyPaymentLink(url);
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
        className="motion-press grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary"
      >
        {copied ? <Check className="size-3.5 text-mint" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export type LinkPublishedDetails = {
  url: string;
  name: string;
  amount: number;
  currency: string;
  parties: { name: string; address: string; bps: number }[];
};

/**
 * Rich "Payment link published" toast with the full URL front-and-center.
 */
export function showLinkPublished({ url, name, amount, currency, parties }: LinkPublishedDetails) {
  toast.success("Payment link published", {
    description: (
      <div className="w-full space-y-2.5 text-left">
        <p className="truncate text-xs font-semibold text-foreground">{name}</p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency} ·{" "}
          {parties.map((p) => `${p.bps / 100}%`).join(" · ")}
        </p>
        <LinkUrlField url={url} />
        <p className="text-[10px] text-muted-foreground/70">
          Saved to this wallet ·{" "}
          {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    ),
    duration: 10_000,
    classNames: {
      toast: "w-[min(22rem,calc(100vw-2rem))] items-start!",
      description: "w-full!",
    },
  });
}
