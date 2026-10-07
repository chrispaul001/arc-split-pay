import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useConfig, useReadContract, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectWallet } from "@/components/connect-wallet";
import { TxProgress, type TxStatus, type TxStep } from "@/components/tx-progress";
import {
  CHECKOUT_TOKENS,
  COINDECC_PAY_ABI,
  COINDECC_PAY_ADDRESS,
  DEFAULT_SPLIT_ID,
  SPLIT_ROUTER_ABI,
  SPLIT_ROUTER_ADDRESS,
  ERC20_ABI,
  arcTestnet,
  explorerTx,
  shortAddress,
  type CheckoutToken,
} from "@/lib/web3";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import { recordPayment } from "@/lib/payment-events";
import { OnrampCheckoutModal } from "@/components/OnrampCheckoutModal";

type StepState = { status: TxStatus; hash?: string; error?: string };
type Phase = "idle" | "checking" | "approving" | "executing";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  checking: "Checking Allowance...",
  approving: "Approving Token...",
  executing: "Executing Split...",
};

/** Accepts plain decimals with at most `decimals` fractional digits. */
const validAmount = (v: string, decimals: number) =>
  new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(v) && Number(v) > 0;

export function OnchainCheckout({ fixedAmount, guard, shares }: { fixedAmount?: number | undefined; guard?: (() => Promise<boolean>) | undefined; shares?: { address: string; bps: number }[] | undefined } = {}) {
  const config = useConfig();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const useSplitter = Boolean(shares?.length);
  const [token, setToken] = useState<CheckoutToken>(CHECKOUT_TOKENS[0]);
  const active = useSplitter ? token : CHECKOUT_TOKENS[0]; // legacy pay() contract is USDC-only
  const [amount, setAmount] = useState(fixedAmount ? String(fixedAmount) : "25");
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState(false);
  const [approve, setApprove] = useState<StepState>({ status: "idle" });
  const [pay, setPay] = useState<StepState>({ status: "idle" });

  const spender = useSplitter ? SPLIT_ROUTER_ADDRESS : COINDECC_PAY_ADDRESS;
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;
  const busy = phase !== "idle";

  const balanceQ = useReadContract({
    address: active.address, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, chainId: arcTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const balance = balanceQ.data as bigint | undefined;

  const steps: TxStep[] = [
    {
      key: "approve",
      label: `Approve ${active.symbol} spend`,
      description: `Allow ${useSplitter ? "CoindeccSplitter" : "CoindeccPay"} ${shortAddress(spender)} to move ${active.symbol}`,
      status: approve.status, hash: approve.hash, error: approve.error,
    },
    {
      key: "pay",
      label: useSplitter ? "Execute split" : "Send payment",
      description: useSplitter ? "One signature pays every recipient atomically on Arc" : "Confirm your USDC payment on Arc",
      status: pay.status, hash: pay.hash, error: pay.error,
    },
  ];

  const reset = () => {
    setApprove({ status: "idle" });
    setPay({ status: "idle" });
    setDone(false);
  };

  const payNow = async () => {
    if (!address) return;
    if (guard && !(await guard())) {
      toast.error("This payment link is no longer active.");
      return;
    }
    if (wrongNetwork) {
      try { await switchChainAsync({ chainId: arcTestnet.id }); }
      catch { toast.error("Switch to Arc Network to continue"); }
      return;
    }
    const decimals = active.decimals;
    if (!validAmount(amount, decimals)) {
      toast.error("Please enter a valid amount.", { description: `${active.symbol} supports up to ${decimals} decimal places.` });
      return;
    }
    if (useSplitter && shares!.reduce((t, s) => t + s.bps, 0) !== 10_000) {
      toast.error("This link's split doesn't add up to 100%.");
      return;
    }

    reset();
    setPhase("checking");
    try {
      const value = parseUnits(amount, decimals);
      const bal = (await readContract(config, {
        address: active.address, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: arcTestnet.id,
      })) as bigint;
      if (bal < value) {
        toast.error(`Insufficient ${active.symbol} balance`, { description: `You hold ${formatUnits(bal, decimals)} ${active.symbol}.` });
        return;
      }

      const allowance = (await readContract(config, {
        address: active.address, abi: ERC20_ABI, functionName: "allowance", args: [address, spender], chainId: arcTestnet.id,
      })) as bigint;

      if (allowance < value) {
        setPhase("approving");
        setApprove({ status: "wallet" });
        try {
          const hash = await writeContract(config, {
            address: active.address, abi: ERC20_ABI, functionName: "approve", args: [spender, value], chainId: arcTestnet.id,
          });
          setApprove({ status: "pending", hash });
          const receipt = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
          if (receipt.status !== "success") throw new Error("Approval failed on-chain.");
          setApprove({ status: "confirmed", hash });
          toast.success(`${active.symbol} approved`);
        } catch (e) {
          setApprove((s) => ({ status: "failed", ...(s.hash ? { hash: s.hash } : {}), error: errMessage(e) }));
          throw e;
        }
      } else {
        setApprove({ status: "confirmed" });
      }

      setPhase("executing");
      setPay({ status: "wallet" });
      try {
        const hash = useSplitter && shares
          ? await writeContract(config, {
              address: SPLIT_ROUTER_ADDRESS, abi: SPLIT_ROUTER_ABI, functionName: "splitToken",
              args: [active.address, value, shares.map((s) => ({ recipient: s.address as `0x${string}`, bps: BigInt(s.bps) }))],
              chainId: arcTestnet.id,
            })
          : await writeContract(config, {
              address: COINDECC_PAY_ADDRESS, abi: COINDECC_PAY_ABI, functionName: "pay",
              args: [DEFAULT_SPLIT_ID, value], chainId: arcTestnet.id,
            });
        setPay({ status: "pending", hash });
        const receipt = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
        if (receipt.status !== "success") throw new Error("Payment failed on-chain.");
        setPay({ status: "confirmed", hash });
        if (active.symbol === "USDC") recordPayment({ hash, sender: address, amount: Number(amount) });
        setDone(true);
        toast.success(useSplitter ? "Split executed on Arc" : "Payment settled on Arc");
        void balanceQ.refetch();
      } catch (e) {
        setPay((s) => ({ status: "failed", ...(s.hash ? { hash: s.hash } : {}), error: errMessage(e) }));
        throw e;
      }
    } catch (e) {
      toast.error("Transaction failed", { description: errMessage(e) });
    } finally {
      setPhase("idle");
    }
  };

  const showProgress = approve.status !== "idle" || pay.status !== "idle";

  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 box-border sm:px-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">On-chain checkout</h3>
          <p className="mt-1 text-xs break-words text-muted-foreground">
            Live {active.symbol} payment {useSplitter ? "split atomically by CoindeccSplitter" : "to CoindeccPay"}{" "}
            <span className="font-mono">{shortAddress(spender)}</span> on Arc Network Testnet.
          </p>
        </div>
        <ShieldCheck className="size-5 shrink-0 text-mint" />
      </div>

      <div className="mt-4">
        <ConnectWallet />
      </div>

      {isConnected && (
        <div className="mt-4 space-y-3">
          {useSplitter && (
            <div className="space-y-1.5">
              <Label>Pay with</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment token">
                {CHECKOUT_TOKENS.map((t) => (
                  <button
                    key={t.symbol}
                    type="button"
                    role="radio"
                    aria-checked={t.symbol === token.symbol}
                    disabled={busy}
                    onClick={() => { setToken(t); reset(); }}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                      t.symbol === token.symbol
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="onchain-amount">Amount ({active.symbol})</Label>
            <Input
              id="onchain-amount"
              inputMode="decimal"
              value={amount}
              readOnly={!!fixedAmount}
              onChange={(e) => {
                const v = e.target.value.replace(",", ".");
                if (v === "" || new RegExp(`^\\d*(\\.\\d{0,${active.decimals}})?$`).test(v)) setAmount(v);
                reset();
              }}
              className="tabular-nums"
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Wallet balance: {balance == null ? "—" : `${Number(formatUnits(balance, active.decimals)).toLocaleString(undefined, { maximumFractionDigits: active.decimals })} ${active.symbol}`}
            </p>
          </div>

          {done && pay.hash ? (
            <div className="animate-rise space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 rounded-xl border border-mint/30 bg-mint/10 p-3 text-mint">
                <CheckCircle2 className="size-6 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold">Payment Successful</h4>
                  <p className="text-xs opacity-90">Funds successfully split and routed on Arc Network.</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border/50 pt-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3 py-1">
                  <span>Amount Settled</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: active.decimals })} {active.symbol}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-1">
                  <span>Network</span>
                  <span className="font-medium text-foreground">Arc Network Testnet</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-1">
                  <span>Transaction Hash</span>
                  <a href={explorerTx(pay.hash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-primary hover:underline">
                    {pay.hash.slice(0, 6)}…{pay.hash.slice(-4)}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
              {!fixedAmount && (
                <Button variant="secondary" className="w-full" onClick={reset}>
                  <RotateCcw className="size-4" /> Make Another Payment
                </Button>
              )}
            </div>
          ) : (
            <>
              <Button className="w-full transition-transform active:scale-[0.98]" size="lg" disabled={busy} onClick={() => void payNow()}>
                {busy ? (
                  <><Loader2 className="size-4 animate-spin" /> {PHASE_LABEL[phase as Exclude<Phase, "idle">]}</>
                ) : (
                  <>
                    <Wallet className="size-4" />{" "}
                    {wrongNetwork ? "Switch network" : useSplitter ? `Pay & Split ${amount || "0"} ${active.symbol}` : `Pay ${amount || "0"} USDC`}
                  </>
                )}
              </Button>

              {address && active.symbol === "USDC" && <OnrampCheckoutModal destinationAddress={address} amount={amount} />}

              {showProgress && <TxProgress steps={steps} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function errMessage(e: unknown) {
  const err = e as { shortMessage?: string; message?: string };
  const message = err?.shortMessage ?? err?.message ?? "";
  if (/rejected|denied|cancelled/i.test(message)) return "The request was cancelled in your wallet.";
  if (/insufficient funds/i.test(message)) return "Your wallet doesn't have enough funds for this payment.";
  return "The payment couldn't be completed. Please try again.";
}
