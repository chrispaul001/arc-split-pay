import { connectorsForWallets, type Wallet } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  phantomWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arcTestnet } from "@/lib/web3";

// Dedicated CoindeccPay WalletConnect (Reown) project id. It is a public,
// client-side identifier — safe to ship in the bundle. Replace only by rotating
// the project on cloud.reown.com.
const projectId =
  (import.meta.env['VITE_WALLETCONNECT_PROJECT_ID'] as string | undefined) ??
  "1c7f3b42e7aa4b078b0fd48db8602a9d";

const APP_URL = "https://coindeccpay.lovable.app";

/**
 * Explicit dApp metadata. Without this, several mobile wallet clients drop the
 * WalletConnect pairing request instead of showing a connection prompt.
 */
const walletConnectParameters = {
  metadata: {
    name: "CoindeccPay",
    description:
      "Embeddable USDC checkout links, automated split-routing, and real-time on-chain telemetry on Arc.",
    url: APP_URL,
    icons: [`${APP_URL}/favicon.png`],
  },
};

const hasInjectedProvider = () =>
  typeof window !== "undefined" &&
  typeof (window as { ethereum?: unknown }).ethereum !== "undefined";

/**
 * "Browser Wallet" only works when an extension injects a provider. On mobile
 * Safari/Chrome there is none, so the entry would silently reject on tap.
 * Hiding it there keeps every visible option functional.
 */
const browserWallet = (...args: Parameters<typeof injectedWallet>): Wallet => ({
  ...injectedWallet(...args),
  hidden: () => !hasInjectedProvider(),
});

/**
 * RainbowKit hands iOS raw custom schemes (`rainbow://`, `trust://`, …), which
 * Safari drops silently when the app isn't installed — the tap looks dead.
 * HTTPS universal links work whether or not the wallet is installed.
 */
type WalletFn = (options: never) => Wallet;

const withUniversalLink =
  <T extends WalletFn>(walletFn: T, buildUri: (uri: string) => string) =>
  (...args: Parameters<T>): Wallet => {
    const wallet = walletFn(...(args as [never]));
    return { ...wallet, mobile: { getUri: buildUri } };
  };

const rainbowUniversalWallet = withUniversalLink(
  rainbowWallet,
  (uri) => `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`,
);

const trustUniversalWallet = withUniversalLink(
  trustWallet,
  (uri) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
);

const zerionUniversalWallet = withUniversalLink(
  zerionWallet,
  (uri) => `https://wallet.zerion.io/wc?uri=${encodeURIComponent(uri)}`,
);

const okxUniversalWallet = withUniversalLink(
  okxWallet,
  (uri) =>
    `https://www.okx.com/download?deeplink=${encodeURIComponent(
      `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(APP_URL)}&wcUri=${encodeURIComponent(uri)}`,
    )}`,
);

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, rainbowUniversalWallet, coinbaseWallet, walletConnectWallet],
    },
    {
      groupName: "More wallets",
      wallets: [
        trustUniversalWallet,
        phantomWallet,
        okxUniversalWallet,
        zerionUniversalWallet,
        browserWallet,
      ],
    },
  ],
  {
    appName: "CoindeccPay",
    appDescription: walletConnectParameters.metadata.description,
    appUrl: APP_URL,
    appIcon: `${APP_URL}/favicon.png`,
    projectId,
    walletConnectParameters,
  },
);

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors,
  transports: { [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]) },
  ssr: true,
});
