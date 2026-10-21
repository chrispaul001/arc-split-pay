import { useRef, useState } from "react";
import { isAddress, maxUint256, parseUnits } from "viem";
import { useAccount, useConfig, useSwitchChain, useWriteContract } from "wagmi";
import { getBlock, readContract, waitForTransactionReceipt } from "wagmi/actions";
import { CHECKOUT_TOKENS, ERC20_ABI, SPLIT_ROUTER_ABI, SPLIT_ROUTER_ADDRESS, arcTestnet, type CheckoutToken } from "@/lib/web3";
import { recordTx, type TxRecord } from "@/lib/tx-history";
import { createWalletRun, type WalletRun } from "@/lib/wallet-guard";

export type SplitShare = { name: string; address: string; bps: number };
export type SplitPhase = "idle" | "approving" | "processing";

/**
 * Atomic, non-custodial split: the connected wallet signs ONE splitToken() call on the
 * split router, which pays every recipient in the same transaction. A one-time USDC
 * spending approval is requested only if the router's allowance is too low.
 * Every wallet prompt has a 35s timeout and the run can be cancelled manually.
 */
export function useSplitSend() {
  const config = useConfig();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<SplitPhase>("idle");
  const runRef = useRef<WalletRun | null>(null);

  const cancel = () => {
    runRef.current?.cancel();
    runRef.current?.dispose();
    runRef.current = null;
    setPhase("idle");
  };

  const send = async (amount: number, shares: SplitShare[], label: string, token: CheckoutToken = CHECKOUT_TOKENS[0]): Promise<`0x${string}`> => {
    if (!address) throw new Error("Connect a wallet first");
    const active = shares.filter((s) => s.bps > 0);
    if (!active.length) throw new Error("Add at least one recipient");
    const bad = active.find((s) => !isAddress(s.address));
    if (bad) throw new Error(`Invalid wallet address for ${bad.name || "a recipient"}`);
    if (active.reduce((t, s) => t + s.bps, 0) !== 10000) throw new Error("Split must total 100%");
    if (!(amount > 0)) throw new Error("Enter an amount");
    runRef.current?.cancel();
    const run = createWalletRun();
    runRef.current = run;
    try {
      if (chainId !== arcTestnet.id) await run.wallet(switchChainAsync({ chainId: arcTestnet.id }));
      const read = (functionName: "decimals" | "balanceOf" | "allowance", args?: readonly unknown[]) =>
        run.wait(readContract(config, { address: token.address, abi: ERC20_ABI, functionName, args: args as never, chainId: arcTestnet.id }));
      const decimals = Number(await read("decimals"));
      const value = parseUnits(amount.toFixed(Math.min(decimals, token.decimals)), decimals);
      if (value === 0n) throw new Error("Amount too small");
      if (((await read("balanceOf", [address])) as bigint) < value) throw new Error(`Insufficient ${token.symbol} balance`);

      if (((await read("allowance", [address, SPLIT_ROUTER_ADDRESS])) as bigint) < value) {
        setPhase("approving");
        const approveHash = await run.wallet(writeContractAsync({
          address: token.address, abi: ERC20_ABI, functionName: "approve",
          args: [SPLIT_ROUTER_ADDRESS, maxUint256], chainId: arcTestnet.id,
        }));
        const ar = await run.wait(waitForTransactionReceipt(config, { hash: approveHash, chainId: arcTestnet.id }));
        if (ar.status !== "success") throw new Error("Approval failed");
      }

      setPhase("processing");
      const hash = await run.wallet(writeContractAsync({
        address: SPLIT_ROUTER_ADDRESS, abi: SPLIT_ROUTER_ABI, functionName: "splitToken",
        args: [token.address, value, active.map((s) => ({ recipient: s.address as `0x${string}`, bps: BigInt(s.bps) }))],
        chainId: arcTestnet.id,
      }));
      const r = await run.wait(waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id }));
      if (r.status !== "success") throw new Error("The split couldn't be completed");
      const timestamp = await blockTime(config, r.blockNumber);
      const splits: TxRecord["splits"] = active.map(({ name, address, bps }) => ({ name, address, bps }));
      // Per-recipient amounts so the receipt shows "amount received" immediately (chain sync later confirms exact legs).
      const transfers: TxRecord["transfers"] = active.map(({ address, bps }) => ({ address, amount: (Number(amount) * bps) / 10_000 }));
      recordTx({ hash, kind: "split", from: address, to: active.length === 1 ? active[0]!.address : undefined, amount, token: token.symbol, label, splits, transfers, timestamp });
      return hash;
    } finally {
      run.dispose();
      if (runRef.current === run) { runRef.current = null; setPhase("idle"); }
    }
  };

  return { send, phase, cancel };
}

/** Exact on-chain confirmation time (ms) for a block; falls back to now if the RPC can't serve it. */
export async function blockTime(config: Parameters<typeof getBlock>[0], blockNumber: bigint): Promise<number> {
  try {
    const b = await getBlock(config, { blockNumber, chainId: arcTestnet.id });
    return Number(b.timestamp) * 1000;
  } catch { return Date.now(); }
}
