import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arcTestnet } from "@/lib/web3";

// Dedicated CoindeccPay WalletConnect (Reown) project id. It is a public,
// client-side identifier — safe to ship in the bundle. Replace only by rotating
// the project on cloud.reown.com.
const projectId =
  (import.meta.env['VITE_WALLETCONNECT_PROJECT_ID'] as string | undefined) ??
  "1c7f3b42e7aa4b078b0fd48db8602a9d";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet, injectedWallet],
    },
  ],
  { appName: "CoindeccPay", projectId },
);

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors,
  transports: { [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]) },
  ssr: true,
});
