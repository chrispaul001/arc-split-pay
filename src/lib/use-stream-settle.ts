import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import { useAccount, useConfig, useSwitchChain, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { ERC20_ABI, USDC_ADDRESS, arcTestnet } from "@/lib/web3";
import { recordPayment } from "@/lib/payment-events";

/** Non-custodial stream settlement: the connected wallet signs a USDC transfer on Arc Testnet. */
export function useStreamSettle() {
  const config = useConfig();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [busyId, setBusyId] = useState<string | null>(null);

  const settle = async (streamId: string, recipient: string, amount: number): Promise<`0x${string}`> => {
    if (!address) throw new Error("Connect a wallet first");
    if (!isAddress(recipient)) throw new Error("Recipient wallet address is invalid");
    if (!(amount > 0)) throw new Error("Nothing to settle yet");
    setBusyId(streamId);
    try {
      if (chainId !== arcTestnet.id) await switchChainAsync({ chainId: arcTestnet.id });
      const decimals = Number(
        await readContract(config, { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "decimals", chainId: arcTestnet.id }),
      );
      const value = parseUnits(amount.toFixed(Math.min(decimals, 6)), decimals);
      if (value === 0n) throw new Error("Amount too small to settle");
      const balance = (await readContract(config, {
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: arcTestnet.id,
      })) as bigint;
      if (balance < value) throw new Error("Insufficient USDC balance");
      const hash = await writeContractAsync({
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "transfer",
        args: [recipient, value], chainId: arcTestnet.id,
      });
      const r = await waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id });
      if (r.status !== "success") throw new Error("Settlement reverted on-chain");
      recordPayment({ hash, sender: address, amount });
      return hash;
    } finally {
      setBusyId(null);
    }
  };

  return { settle, busyId };
}
