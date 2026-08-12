import { useState } from "react";
import { Contract, formatUnits, parseUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectWallet } from "@/components/connect-wallet";
import { useWallet } from "@/lib/wallet";
import {
  COINDECC_PAY_ABI,
  COINDECC_PAY_ADDRESS,
  ERC20_ABI,
  USDC_ADDRESS,
  explorerTx,
  shortAddress,
} from "@/lib/web3";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, ShieldCheck, Wallet } from "lucide-react";

type Step = "idle" | "approving" | "paying" | "done";

export function OnchainCheckout() {
  const { address, wrongNetwork, switchNetwork, getProvider, refreshBalance, usdcBalance } = useWallet();
  const [amount, setAmount] = useState("25");
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const busy = step === "approving" || step === "paying";

  const payNow = async () => {
    const provider = getProvider();
    if (!provider || !address) return;
    if (wrongNetwork) {
      await switchNetwork();
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const signer = await provider.getSigner();
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const decimals = Number(await usdc['decimals']!());
      const value = parseUnits(amount, decimals);

      const balance = (await usdc['balanceOf']!(address)) as bigint;
      if (balance < value) {
        toast.error("Insufficient USDC balance", {
          description: `You hold ${formatUnits(balance, decimals)} USDC.`,
        });
        return;
      }

      const allowance = (await usdc['allowance']!(address, COINDECC_PAY_ADDRESS)) as bigint;
      if (allowance < value) {
        setStep("approving");
        toast("Approval required", { description: "Approve the USDC spend in MetaMask." });
        const approveTx = await usdc['approve']!(COINDECC_PAY_ADDRESS, value);
        await approveTx.wait();
        toast.success("USDC spend approved");
      }

      setStep("paying");
      const pay = new Contract(COINDECC_PAY_ADDRESS, COINDECC_PAY_ABI, signer);
      const tx = await pay['pay']!(value);
      const receipt = await tx.wait();
      setTxHash(receipt?.hash ?? tx.hash);
      setStep("done");
      toast.success("Payment settled on Arc");
      void refreshBalance();
    } catch (e) {
      setStep("idle");
      const err = e as { shortMessage?: string; message?: string };
      toast.error("Transaction failed", { description: err.shortMessage ?? err.message ?? "Unknown error" });
    }
  };

  return (
    <div className="glass animate-rise w-full max-w-full rounded-3xl px-4 py-5 sm:px-5">
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

      {address && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="onchain-amount">Amount (USDC)</Label>
            <Input
              id="onchain-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setStep("idle");
                setTxHash(null);
              }}
              className="tabular-nums"
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Wallet balance: {usdcBalance == null ? "—" : `${Number(usdcBalance).toLocaleString()} USDC`}
            </p>
          </div>

          <Button className="w-full transition-transform active:scale-[0.98]" size="lg" disabled={busy} onClick={() => void payNow()}>
            {step === "approving" && (
              <>
                <Loader2 className="size-4 animate-spin" /> Approving USDC…
              </>
            )}
            {step === "paying" && (
              <>
                <Loader2 className="size-4 animate-spin" /> Confirming payment…
              </>
            )}
            {step === "done" && (
              <>
                <Check className="size-4" /> Paid
              </>
            )}
            {step === "idle" && (
              <>
                <Wallet className="size-4" /> {wrongNetwork ? "Switch network" : "Pay Now"}
              </>
            )}
          </Button>

          {txHash && (
            <a
              href={explorerTx(txHash)}
              target="_blank"
              rel="noreferrer"
              className="glow-border flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl bg-secondary/50 p-3 text-xs"
            >
              <span className="min-w-0">
                <span className="block text-muted-foreground">Transaction hash</span>
                <span className="block truncate font-mono tabular-nums">{txHash}</span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-primary" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
