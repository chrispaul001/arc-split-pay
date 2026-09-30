import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useConfig, useSwitchChain, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { COINDECC_PAY_ABI, COINDECC_PAY_ADDRESS, DEFAULT_SPLIT_ID, ERC20_ABI, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import type { TxStatus } from "@/components/tx-progress";
import { recordPayment } from "@/lib/payment-events";

export type StepState = { status: TxStatus; hash?: string; error?: string };

export function errMessage(e: unknown) {
  const err = e as { shortMessage?: string; message?: string };
  return err?.shortMessage ?? err?.message ?? "Unknown error";
}

/** Real approve → pay() flow against the CoindeccPay contract on Arc Testnet. */
export function usePay() {
  const config = useConfig();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [approve, setApprove] = useState<StepState>({ status: "idle" });
  const [pay, setPay] = useState<StepState>({ status: "idle" });
  const [busy, setBusy] = useState(false);

  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  const reset = () => {
    setApprove({ status: "idle" });
    setPay({ status: "idle" });
  };

  /** Resolves to the pay tx hash; throws on failure. */
  const execute = async (amount: string, splitId: `0x${string}` = DEFAULT_SPLIT_ID): Promise<`0x${string}`> => {
    if (!address) throw new Error("Connect a wallet first");
    if (wrongNetwork) await switchChainAsync({ chainId: arcTestnet.id });
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a valid amount");

    reset();
    setBusy(true);
    try {
      const decimals = Number(
        await readContract(config, { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "decimals", chainId: arcTestnet.id }),
      );
      const value = parseUnits(amount, decimals);
      const balance = (await readContract(config, {
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: arcTestnet.id,
      })) as bigint;
      if (balance < value) throw new Error("Insufficient USDC balance");

      const allowance = (await readContract(config, {
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
        args: [address, COINDECC_PAY_ADDRESS], chainId: arcTestnet.id,
      })) as bigint;

      if (allowance < value) {
        setApprove({ status: "wallet" });
        try {
          const hash = await writeContractAsync({
            address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve",
            args: [COINDECC_PAY_ADDRESS, value], chainId: arcTestnet.id,
          });
          setApprove({ status: "pending", hash });
          const r = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
          if (r.status !== "success") throw new Error("Approval reverted on-chain");
          setApprove({ status: "confirmed", hash });
        } catch (e) {
          setApprove((s) => ({ ...s, status: "failed", error: errMessage(e) }));
          throw e;
        }
      } else {
        setApprove({ status: "confirmed" });
      }

      setPay({ status: "wallet" });
      try {
        const [, , active] = (await readContract(config, {
          address: COINDECC_PAY_ADDRESS, abi: COINDECC_PAY_ABI, functionName: "getSplit",
          args: [splitId], chainId: arcTestnet.id,
        })) as readonly [readonly string[], readonly number[], boolean];
        if (!active) throw new Error("This split is not active on the contract");
        const paused = await readContract(config, {
          address: COINDECC_PAY_ADDRESS, abi: COINDECC_PAY_ABI, functionName: "paused", chainId: arcTestnet.id,
        });
        if (paused) throw new Error("Payments are paused on the contract");
        const hash = await writeContractAsync({
          address: COINDECC_PAY_ADDRESS, abi: COINDECC_PAY_ABI, functionName: "pay",
          args: [splitId, value], chainId: arcTestnet.id,
        });
        setPay({ status: "pending", hash });
        const r = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
        if (r.status !== "success") throw new Error("Payment reverted on-chain");
        setPay({ status: "confirmed", hash });
        recordPayment({ hash, sender: address, amount: n });
        return hash;
      } catch (e) {
        setPay((s) => ({ ...s, status: "failed", error: errMessage(e) }));
        throw e;
      }
    } finally {
      setBusy(false);
    }
  };

  return { execute, reset, approve, pay, busy, wrongNetwork, isConnected };
}
