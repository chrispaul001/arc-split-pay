import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectWallet } from "@/components/connect-wallet";
import { TxProgress, type TxStatus, type TxStep } from "@/components/tx-progress";
import { useUsdc } from "@/lib/use-usdc";
import {
  COINDECC_PAY_ABI,
  COINDECC_PAY_ADDRESS,
  DEFAULT_SPLIT_ID,
  ERC20_ABI,
  USDC_ADDRESS,
  arcTestnet,
  explorerTx,
  shortAddress,
} from "@/lib/web3";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import { recordPayment } from "@/lib/payment-events";
import { OnrampCheckoutModal } from "@/components/OnrampCheckoutModal";

type StepState = { status: TxStatus; hash?: string; error?: string };

export function OnchainCheckout({ fixedAmount, guard }: { fixedAmount?: number | undefined; guard?: (() => Promise<boolean>) | undefined } = {}) {
  const config = useConfig();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { formatted, refetch } = useUsdc();

  const [amount, setAmount] = useState(fixedAmount ? String(fixedAmount) : "25");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [approve, setApprove] = useState<StepState>({ status: "idle" });
  const [pay, setPay] = useState<StepState>({ status: "idle" });

  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  const steps: TxStep[] = [
    {
      key: "approve",
      label: "Approve USDC spend",
      description: `Allow CoindeccPay ${shortAddress(COINDECC_PAY_ADDRESS)} to move USDC`,
      status: approve.status,
      hash: approve.hash,
      error: approve.error,
    },
    {
      key: "pay",
      label: "Send payment",
      description: "Confirm your USDC payment on Arc",
      status: pay.status,
      hash: pay.hash,
      error: pay.error,
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
      try {
        await switchChainAsync({ chainId: arcTestnet.id });
      } catch {
        toast.error("Switch to Arc Network to continue");
      }
      return;
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    reset();
    setBusy(true);
    try {
      const decimals = Number(
        await readContract(config, {
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "decimals",
          chainId: arcTestnet.id,
        }),
      );
      const value = parseUnits(amount, decimals);

      const balance = (await readContract(config, {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
        chainId: arcTestnet.id,
      })) as bigint;

      if (balance < value) {
        setBusy(false);
        toast.error("Insufficient USDC balance", {
          description: `You hold ${formatUnits(balance, decimals)} USDC.`,
        });
        return;
      }

      const allowance = (await readContract(config, {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, COINDECC_PAY_ADDRESS],
        chainId: arcTestnet.id,
      })) as bigint;

      if (allowance < value) {
        setApprove({ status: "wallet" });
        try {
          const hash = await writeContract(config, {
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [COINDECC_PAY_ADDRESS, value],
            chainId: arcTestnet.id,
          });
          setApprove({ status: "pending", hash });
          const receipt = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
          if (receipt.status !== "success") throw new Error("Approval failed on-chain.");
          setApprove({ status: "confirmed", hash });
        } catch (e) {
          const msg = errMessage(e);
          setApprove((s) => ({ status: "failed", ...(s.hash ? { hash: s.hash } : {}), error: msg }));
          throw e;
        }
      } else {
        setApprove({ status: "confirmed" });
      }

      setPay({ status: "wallet" });
      try {
        const hash = await writeContract(config, {
          address: COINDECC_PAY_ADDRESS,
          abi: COINDECC_PAY_ABI,
          functionName: "pay",
          args: [DEFAULT_SPLIT_ID, value],
          chainId: arcTestnet.id,
        });
        setPay({ status: "pending", hash });
        const receipt = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
        if (receipt.status !== "success") throw new Error("Payment failed on-chain.");
        setPay({ status: "confirmed", hash });
        recordPayment({ hash, sender: address, amount: parsed });
        setDone(true);
        toast.success("Payment settled on Arc");
        void refetch();
      } catch (e) {
        const msg = errMessage(e);
        setPay((s) => ({ status: "failed", ...(s.hash ? { hash: s.hash } : {}), error: msg }));
        throw e;
      }
    } catch (e) {
      toast.error("Transaction failed", { description: errMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const showProgress = approve.status !== "idle" || pay.status !== "idle";

  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 box-border sm:px-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">On-chain checkout</h3>
          <p className="mt-1 text-xs break-words text-muted-foreground">
            Live USDC payment to CoindeccPay{" "}
            <span className="font-mono">{shortAddress(COINDECC_PAY_ADDRESS)}</span> on Arc Network Testnet.
          </p>
        </div>
        <ShieldCheck className="size-5 shrink-0 text-mint" />
      </div>

      <div className="mt-4">
        <ConnectWallet />
      </div>

      {isConnected && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="onchain-amount">Amount (USDC)</Label>
            <Input
              id="onchain-amount"
              inputMode="decimal"
              value={amount}
              readOnly={!!fixedAmount}
              onChange={(e) => {
                setAmount(e.target.value);
                reset();
              }}
              className="tabular-nums"
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Wallet balance: {formatted == null ? "—" : `${Number(formatted).toLocaleString()} USDC`}
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
                    {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-1">
                  <span>Network</span>
                  <span className="font-medium text-foreground">Arc Network Testnet</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-1">
                  <span>Transaction Hash</span>
                  <a
                    href={explorerTx(pay.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-primary hover:underline"
                  >
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
              <Button
                className="w-full transition-transform active:scale-[0.98]"
                size="lg"
                disabled={busy}
                onClick={() => void payNow()}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {approve.status === "wallet" || approve.status === "pending"
                      ? "Approving USDC…"
                      : "Confirming payment…"}
                  </>
                ) : (
                  <>
                    <Wallet className="size-4" /> {wrongNetwork ? "Switch network" : `Pay ${amount || "0"} USDC`}
                  </>
                )}
              </Button>

              {address && <OnrampCheckoutModal destinationAddress={address} amount={amount} />}

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
