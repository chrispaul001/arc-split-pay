import { useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CURRENCIES, formatLocal, tokenToUsd, useFxRates, type CurrencyCode } from "@/lib/currency";
import { explorerTx, shortAddress } from "@/lib/web3";
import logoTile from "@/assets/coindecc-tile.png.asset.json";

export type ReceiptData = {
  hash: string;
  amount: number;
  token: string;
  timestamp: number;
  payer?: string | undefined;
  label?: string | undefined;
  /** Recipient legs; shown as a split breakdown when there are 2+. */
  allocations?: { address: string; name?: string | undefined; bps?: number | undefined; amount: number }[] | undefined;
};

const fmtAmt = (n: number, token: string) =>
  `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: token === "cirBTC" ? 8 : 6 })} ${token}`;

/** Local value for any supported token (USDC 1:1, EURC/cirBTC via live spot price). */
const localValue = (r: ReceiptData, code: CurrencyCode) => {
  const usd = tokenToUsd(r.amount, r.token);
  return usd == null ? null : formatLocal(usd, code);
};

function normAllocations(r: ReceiptData) {
  const legs = r.allocations ?? [];
  if (legs.length < 2) return [];
  const total = legs.reduce((t, l) => t + l.amount, 0) || r.amount || 1;
  return legs.map((l) => ({ ...l, pct: l.bps != null ? l.bps / 100 : (l.amount / total) * 100 }));
}

export function DownloadReceiptButton({ data, className }: { data: ReceiptData; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="secondary" className={`gap-1.5 rounded-full text-xs ${className ?? ""}`} onClick={() => setOpen(true)}>
        <FileText className="size-3.5" /> Download Receipt
      </Button>
      {open && <ReceiptModal key={data.hash} data={data} open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function ReceiptModal({ data, open, onOpenChange }: { data: ReceiptData; open: boolean; onOpenChange: (o: boolean) => void }) {
  useFxRates();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const allocations = normAllocations(data);
  const local = localValue(data, currency);
  const date = new Date(data.timestamp);

  const copy = async () => {
    if (!data.payer) return;
    try { await navigator.clipboard.writeText(data.payer); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Couldn't copy address"); }
  };

  const download = async () => {
    setBusy(true);
    try {
      await buildPdf(data, currency);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Couldn't create the PDF. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-3xl border-border/70 p-0">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3 pr-10">
            <img src={logoTile.url} alt="CoindeccPay" className="size-11 shrink-0 rounded-xl ring-1 ring-border/80" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-lg font-bold">CoindeccPay</DialogTitle>
              <DialogDescription className="text-xs">Arc Network Testnet Settlement</DialogDescription>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-[11px] font-bold tracking-wider text-mint">
            <ShieldCheck className="size-3.5" /> SETTLED &amp; VERIFIED
          </span>

          <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">Total amount paid</p>
            <p className="font-display mt-1 text-2xl font-bold tabular-nums text-foreground break-words">{fmtAmt(data.amount, data.token)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {CURRENCIES.map((c) => (
                <button key={c.code} type="button" onClick={() => setCurrency(c.code)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${currency === c.code ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {c.code}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm tabular-nums text-foreground">{local ? `≈ ${local} ${currency}` : "Fetching live price…"}</p>
          </div>

          <dl className="space-y-2.5 text-xs">
            {data.label && <Row k="Description" v={<span className="text-foreground">{data.label}</span>} />}
            <Row k="Date & time" v={<span className="text-foreground">{date.toLocaleString()}</span>} />
            {data.payer && (
              <Row k="Payer wallet" v={
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-primary" aria-label="Copy payer address">
                  {shortAddress(data.payer)} {copied ? <Check className="size-3 text-mint" /> : <Copy className="size-3" />}
                </button>
              } />
            )}
            <Row k="Transaction hash" v={
              <a href={explorerTx(data.hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-primary hover:underline">
                {data.hash.slice(0, 10)}…{data.hash.slice(-6)} <ExternalLink className="size-3" />
              </a>
            } />
          </dl>

          {allocations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Split Allocation Breakdown</p>
              <div className="overflow-hidden rounded-2xl border border-border/70">
                {allocations.map((a, i) => (
                  <div key={`${a.address}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/50 px-3 py-2 text-xs last:border-0">
                    <span className="min-w-0 truncate">
                      {a.name && <span className="font-medium text-foreground">{a.name} · </span>}
                      <span className="font-mono text-muted-foreground">{shortAddress(a.address)}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{a.pct.toFixed(2)}%</span>
                    <span className="font-semibold tabular-nums text-foreground">{fmtAmt(a.amount, data.token)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={() => void download()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 text-right">{v}</dd>
    </div>
  );
}

async function logoPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoTile.url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch { return null; }
}

/** Draws the receipt from data (crisp vector text, high contrast on white). */
async function buildPdf(r: ReceiptData, currency: CurrencyCode) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 56;
  const logo = await logoPng();
  if (logo) doc.addImage(logo, "PNG", M, y - 6, 36, 36);
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(15, 23, 42).text("CoindeccPay", M + 46, y + 8);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(71, 85, 105).text("Arc Network Testnet Settlement", M + 46, y + 24);
  doc.setFillColor(220, 252, 231).roundedRect(W - M - 130, y - 2, 130, 22, 11, 11, "F");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(21, 128, 61).text("SETTLED & VERIFIED", W - M - 65, y + 12, { align: "center" });
  y += 60;
  doc.setDrawColor(226, 232, 240).line(M, y, W - M, y);
  y += 30;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(71, 85, 105).text("Total amount paid", M, y);
  y += 26;
  doc.setFont("helvetica", "bold").setFontSize(24).setTextColor(15, 23, 42).text(fmtAmt(r.amount, r.token), M, y);
  const local = localValue(r, currency);
  if (local) { y += 18; doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(51, 65, 85).text(`Approx. ${local.replace(/[^\d.,]/g, "")} ${currency}`, M, y); }
  y += 34;
  const rows: [string, string][] = [
    ...(r.label ? [["Description", r.label] as [string, string]] : []),
    ["Date & time", new Date(r.timestamp).toLocaleString()],
    ...(r.payer ? [["Payer wallet", r.payer] as [string, string]] : []),
    ["Network", "Arc Network Testnet"],
    ["Transaction hash", r.hash],
  ];
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont("helvetica", "normal").setTextColor(71, 85, 105).text(k, M, y);
    const lines = doc.splitTextToSize(v, W - M * 2 - 120);
    doc.setFont(k.includes("wallet") || k.includes("hash") ? "courier" : "helvetica", "normal").setTextColor(15, 23, 42).text(lines, M + 120, y);
    if (k === "Transaction hash") doc.link(M + 120, y - 10, W - M * 2 - 120, 14 * lines.length, { url: explorerTx(r.hash) });
    y += 16 * lines.length + 6;
  }
  const allocations = normAllocations(r);
  if (allocations.length) {
    y += 14;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(15, 23, 42).text("Split Allocation Breakdown", M, y);
    y += 16;
    doc.setFillColor(241, 245, 249).rect(M, y, W - M * 2, 20, "F");
    doc.setFontSize(9).setTextColor(51, 65, 85).text("Recipient", M + 8, y + 13).text("Share", W - M - 150, y + 13).text("Payout", W - M - 8, y + 13, { align: "right" });
    y += 20;
    for (const a of allocations) {
      if (y > 780) { doc.addPage(); y = 56; }
      y += 16;
      doc.setFont("courier", "normal").setFontSize(9).setTextColor(15, 23, 42).text(`${a.name ? a.name + "  " : ""}${a.address}`.slice(0, 64), M + 8, y);
      doc.setFont("helvetica", "normal").text(`${a.pct.toFixed(2)}%`, W - M - 150, y);
      doc.setFont("helvetica", "bold").text(fmtAmt(a.amount, r.token), W - M - 8, y, { align: "right" });
      y += 6;
      doc.setDrawColor(226, 232, 240).line(M, y, W - M, y);
    }
  }
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 116, 139)
    .text("Non-custodial settlement verified on Arc Network Testnet · coindeccpay.lovable.app", W / 2, 810, { align: "center" });
  doc.save(`CoindeccPay-Receipt-${r.hash}.pdf`);
}
