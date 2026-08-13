import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ERC20_ABI, USDC_ADDRESS, arcTestnet } from "@/lib/web3";

/** Live USDC balance + decimals for the connected wallet on Arc testnet. */
export function useUsdc() {
  const { address, chainId } = useAccount();

  const decimalsQuery = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: arcTestnet.id,
  });

  const balanceQuery = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const decimals = decimalsQuery.data ?? 6;
  const raw = balanceQuery.data as bigint | undefined;

  return {
    decimals: Number(decimals),
    raw,
    formatted: raw == null ? null : formatUnits(raw, Number(decimals)),
    refetch: balanceQuery.refetch,
    wrongNetwork: Boolean(address) && chainId != null && chainId !== arcTestnet.id,
  };
}
