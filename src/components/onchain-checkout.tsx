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
  shortAddress,
} from "@/lib/web3";
import { toast } from "sonner";
import { Check, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { recordPayment } from "@/lib/payment-events";
import { OnrampCheckoutModal } from "@/components/OnrampCheckoutModal";

type StepState = { status: TxStatus; hash?: string; error?: string };

export function OnchainCheckout({ fixedAmount }: { fixedAmount?: number | undefined } = {}) {
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
      label: "Execute pay()",
      description: "Settle the payment on the CoindeccPay contract",
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
    if (wrongNetwork) {
      try {
        await switchChainAsync({ chainId: arcTestnet.id });
      } catch {
        toast.error("Switch to Arc Network Testnet to continue");
      }
      return;
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount");
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
          if (receipt.status !== "success") throw new Error("Approval reverted on-chain");
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
        if (receipt.status !== "success") throw new Error("Payment reverted on-chain");
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
            ) : done ? (
              <>
                <Check className="size-4" /> Paid
              </>
            ) : (
              <>
                <Wallet className="size-4" /> {wrongNetwork ? "Switch network" : "Pay Now"}
              </>
            )}
          </Button>

          {address && <OnrampCheckoutModal destinationAddress={address} amount={amount} />}

          {showProgress && <TxProgress steps={steps} />}
        </div>
      )}
    </div>
  );
}

function errMessage(e: unknown) {
  const err = e as { shortMessage?: string; message?: string };
  return err?.shortMessage ?? err?.message ?? "Unknown error";
}
