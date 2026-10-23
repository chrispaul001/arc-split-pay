import { useRef, useState } from "react";
import { formatUnits, maxUint256, parseAbiItem, parseUnits } from "viem";
import { useAccount, useConfig, useReadContract, useSwitchChain } from "wagmi";
import { getPublicClient, readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
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
import { WalletStallHelper } from "@/components/wallet-stall-helper";
import { DownloadReceiptButton } from "@/components/ReceiptModal";
import { blockTime } from "@/lib/use-split-send";
import { recordTx } from "@/lib/tx-history";
import { WALLET_TIMEOUT_MESSAGE, createWalletRun, isCancelled, isTimeout, type WalletRun } from "@/lib/wallet-guard";

type StepState = { status: TxStatus; hash?: string; error?: string };
type Phase = "idle" | "checking" | "approving" | "executing";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  checking: "Checking Allowance...",
  approving: "Step 1 of 2 · One-time token approval",
  executing: "Step 2 of 2 · Confirm payment",
};

/** Accepts plain decimals with at most `decimals` fractional digits. */
const validAmount = (v: string, decimals: number) =>
  new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(v) && Number(v) > 0;

export function OnchainCheckout({ fixedAmount, guard, shares }: { fixedAmount?: number | undefined; guard?: (() => Promise<boolean>) | undefined; shares?: { address: string; bps: number }[] | undefined } = {}) {
  const config = useConfig();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [token, setToken] = useState<CheckoutToken>(CHECKOUT_TOKENS[0]);
  // Link shares route through the splitter. Without shares, USDC keeps the legacy pay() route;
  // other tokens go through the splitter to the connected wallet (in-dashboard test checkout).
  const effectiveShares = shares?.length ? shares : token.symbol !== "USDC" && address ? [{ address, bps: 10_000 }] : undefined;
  const useSplitter = Boolean(effectiveShares?.length);
  const active = token;
  const [amount, setAmount] = useState(fixedAmount ? String(fixedAmount) : "25");
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<number | null>(null);
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

  const runRef = useRef<WalletRun | null>(null);
  const cancelRun = () => {
    runRef.current?.cancel();
    runRef.current?.dispose();
    runRef.current = null;
    setPhase("idle");
    reset();
    toast("Transaction cancelled", { description: "If your wallet still shows a request, reject it there." });
  };

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
      try { await createWalletRun().wallet(switchChainAsync({ chainId: arcTestnet.id })); }
      catch { toast.error("Switch to Arc Network to continue"); }
      return;
    }
    const decimals = active.decimals;
    if (!validAmount(amount, decimals)) {
      toast.error("Please enter a valid amount.", { description: `${active.symbol} supports up to ${decimals} decimal places.` });
      return;
    }
    if (useSplitter && effectiveShares!.reduce((t, s) => t + s.bps, 0) !== 10_000) {
      toast.error("This link's split doesn't add up to 100%.");
      return;
    }

    reset();
    runRef.current?.cancel();
    const run = createWalletRun();
    runRef.current = run;
    setPhase("checking");
    try {
      const value = parseUnits(amount, decimals);
      const bal = (await run.wait(readContract(config, {
        address: active.address, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: arcTestnet.id,
      }))) as bigint;
      if (bal < value) {
        toast.error(`Insufficient ${active.symbol} balance`, { description: `You hold ${formatUnits(bal, decimals)} ${active.symbol}.` });
        return;
      }

      const allowance = (await run.wait(readContract(config, {
        address: active.address, abi: ERC20_ABI, functionName: "allowance", args: [address, spender], chainId: arcTestnet.id,
      }))) as bigint;

      if (allowance < value) {
        setPhase("approving");
        setApprove({ status: "wallet" });
        try {
          const hash = await run.wait(writeContract(config, {
            address: active.address, abi: ERC20_ABI, functionName: "approve", args: [spender, maxUint256], chainId: arcTestnet.id,
          }));
          setApprove({ status: "pending", hash });
          const receipt = await run.wait(waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id }));
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
        // Mobile wallets often deliver the hash late (or never) after the app switch.
        // So don't time out: race the wallet reply against an on-chain watcher that
        // spots the outgoing transfer from this wallet to the spender.
        const client = getPublicClient(config, { chainId: arcTestnet.id });
        const fromBlock = client ? await run.wait(client.getBlockNumber()) : 0n;
        const request = useSplitter && effectiveShares
          ? writeContract(config, {
              address: SPLIT_ROUTER_ADDRESS, abi: SPLIT_ROUTER_ABI, functionName: "splitToken",
              args: [active.address, value, effectiveShares.map((s) => ({ recipient: s.address as `0x${string}`, bps: BigInt(s.bps) }))],
              chainId: arcTestnet.id,
            })
          : writeContract(config, {
              address: COINDECC_PAY_ADDRESS, abi: COINDECC_PAY_ABI, functionName: "pay",
              args: [DEFAULT_SPLIT_ID, value], chainId: arcTestnet.id,
            });
        let stop = false;
        const watcher = new Promise<`0x${string}`>((resolve) => {
          const tick = async () => {
            while (!stop) {
              await new Promise((r) => setTimeout(r, 3000));
              if (stop || !client) return;
              try {
                const logs = await client.getLogs({
                  address: active.address, event: TRANSFER_EVENT,
                  args: { from: address }, fromBlock, toBlock: "latest",
                });
                const hit = logs[0];
                if (hit?.transactionHash) { resolve(hit.transactionHash); return; }
              } catch { /* keep polling */ }
            }
          };
          void tick();
        });
        let hash: `0x${string}`;
        try { hash = await run.wait(Promise.race([request, watcher])); }
        finally { stop = true; }
        setPay({ status: "pending", hash });
        const receipt = await run.wait(waitForTransactionReceipt(config, { hash, chainId: arcTestnet.id }));
        if (receipt.status !== "success") throw new Error("Payment failed on-chain.");
        setPay({ status: "confirmed", hash });
        const ts = await blockTime(config, receipt.blockNumber);
        setConfirmedAt(ts);
        if (active.symbol === "USDC") recordPayment({ hash, sender: address, amount: Number(amount) });
        else recordTx({
          hash, kind: useSplitter ? "split" : "payment", from: address, amount: Number(amount), token: active.symbol, timestamp: ts,
          to: effectiveShares?.length === 1 ? effectiveShares[0]!.address : undefined,
          ...(effectiveShares && effectiveShares.length > 1 ? {
            splits: effectiveShares.map((s) => ({ name: "", address: s.address, bps: s.bps })),
            transfers: effectiveShares.map((s) => ({ address: s.address, amount: (Number(amount) * s.bps) / 10_000 })),
          } : {}),
        });
        setDone(true);
        toast.success(useSplitter ? "Split executed on Arc" : "Payment settled on Arc");
        void balanceQ.refetch();
      } catch (e) {
        setPay((s) => ({ status: "failed", ...(s.hash ? { hash: s.hash } : {}), error: errMessage(e) }));
        throw e;
      }
    } catch (e) {
      if (isCancelled(e)) return;
      if (isTimeout(e)) toast.error(WALLET_TIMEOUT_MESSAGE);
      else toast.error("Transaction failed", { description: errMessage(e) });
    } finally {
      run.dispose();
      if (runRef.current === run) { runRef.current = null; setPhase("idle"); }
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
          {(
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
              <DownloadReceiptButton
                className="w-full justify-center rounded-md py-5"
                data={{
                  hash: pay.hash, amount: Number(amount), token: active.symbol, timestamp: confirmedAt ?? Date.now(), payer: address,
                  allocations: effectiveShares?.map((s) => ({ address: s.address, bps: s.bps, amount: (Number(amount) * s.bps) / 10_000 })),
                }}
              />
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
                    {wrongNetwork ? "Switch network" : useSplitter ? `Pay & Split ${amount || "0"} ${active.symbol}` : `Pay ${amount || "0"} ${active.symbol}`}
                  </>
                )}
              </Button>

              {busy && <WalletStallHelper key={phase} label={PHASE_LABEL[phase as Exclude<Phase, "idle">]} onCancel={cancelRun} />}

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
  if (isTimeout(e)) return WALLET_TIMEOUT_MESSAGE;
  const err = e as { shortMessage?: string; message?: string };
  const message = err?.shortMessage ?? err?.message ?? "";
  if (/rejected|denied|cancelled/i.test(message)) return "The request was cancelled in your wallet.";
  if (/insufficient funds/i.test(message)) return "Your wallet doesn't have enough funds for this payment.";
  return "The payment couldn't be completed. Please try again.";
}
