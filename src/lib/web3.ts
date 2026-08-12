// On-chain configuration for Coindecc Pay (Arc Network Testnet).
// Update CHAIN / USDC_ADDRESS if your deployment targets different values.

export const COINDECC_PAY_ADDRESS = "0xbD13692792b8356c142c93Ef5B114166e4Cd2Acd";

/** USDC token used by the CoindeccPay contract on Arc testnet. */
export const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export const ARC_TESTNET = {
  chainIdDecimal: 10247,
  chainId: "0x2807", // 10247
  chainName: "Arc Network Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://explorer.testnet.arc.network"],
} as const;

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
] as const;

export const COINDECC_PAY_ABI = [
  "function pay(uint256 amount)",
] as const;

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const explorerTx = (hash: string) =>
  `${ARC_TESTNET.blockExplorerUrls[0]}/tx/${hash}`;
