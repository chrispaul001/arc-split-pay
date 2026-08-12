import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BrowserProvider, Contract, formatUnits, type Eip1193Provider } from "ethers";
import { ARC_TESTNET, ERC20_ABI, USDC_ADDRESS } from "@/lib/web3";

type Eth = Eip1193Provider & {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

function getEthereum(): Eth | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eth }).ethereum;
}

type WalletState = {
  hasProvider: boolean;
  address: string | null;
  chainId: number | null;
  wrongNetwork: boolean;
  usdcBalance: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  getProvider: () => BrowserProvider | null;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [hasProvider, setHasProvider] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const getProvider = useCallback(() => {
    const eth = getEthereum();
    return eth ? new BrowserProvider(eth) : null;
  }, []);

  const readState = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    const provider = new BrowserProvider(eth);
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    const net = await provider.getNetwork();
    setChainId(Number(net.chainId));
    setAddress(accounts[0] ?? null);
  }, []);

  useEffect(() => {
    const eth = getEthereum();
    setHasProvider(Boolean(eth));
    if (!eth) return;
    void readState();
    const onAccounts = () => void readState();
    const onChain = () => void readState();
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [readState]);

  const refreshBalance = useCallback(async () => {
    const eth = getEthereum();
    if (!eth || !address) {
      setUsdcBalance(null);
      return;
    }
    try {
      const provider = new BrowserProvider(eth);
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const [raw, decimals] = await Promise.all([usdc.balanceOf!(address), usdc.decimals!()]);
      setUsdcBalance(formatUnits(raw as bigint, decimals as number));
    } catch {
      setUsdcBalance(null);
    }
  }, [address]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance, chainId]);

  const switchNetwork = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_TESTNET.chainId }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 4902 || code === -32603) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ARC_TESTNET.chainId,
              chainName: ARC_TESTNET.chainName,
              nativeCurrency: ARC_TESTNET.nativeCurrency,
              rpcUrls: [...ARC_TESTNET.rpcUrls],
              blockExplorerUrls: [...ARC_TESTNET.blockExplorerUrls],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    await readState();
  }, [readState]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) throw new Error("MetaMask not detected");
    setConnecting(true);
    try {
      await eth.request({ method: "eth_requestAccounts" });
      await readState();
    } finally {
      setConnecting(false);
    }
  }, [readState]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setUsdcBalance(null);
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      hasProvider,
      address,
      chainId,
      wrongNetwork: address != null && chainId != null && chainId !== ARC_TESTNET.chainIdDecimal,
      usdcBalance,
      connecting,
      connect,
      disconnect,
      switchNetwork,
      refreshBalance,
      getProvider,
    }),
    [hasProvider, address, chainId, usdcBalance, connecting, connect, disconnect, switchNetwork, refreshBalance, getProvider],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
