// On-chain configuration for Coindecc Pay (Arc Network Testnet).

import { defineChain } from "viem";

export const COINDECC_PAY_ADDRESS = "0xbD13692792b8356c142c93Ef5B114166e4Cd2Acd" as const;

/** USDC token used by the CoindeccPay contract on Arc testnet. */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const ARC_TESTNET = {
  chainIdDecimal: 5042002,
  chainId: "0x4CEA52",
  chainName: "Arc Network Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://explorer.testnet.arc.network"],
} as const;

export const arcTestnet = defineChain({
  id: ARC_TESTNET.chainIdDecimal,
  name: ARC_TESTNET.chainName,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET.rpcUrls[0]] } },
  blockExplorers: {
    default: { name: "Arc Explorer", url: ARC_TESTNET.blockExplorerUrls[0] },
  },
  testnet: true,
});

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const COINDECC_PAY_ABI = [
  {
    type: "function",
    name: "pay",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const explorerTx = (hash: string) => `${ARC_TESTNET.blockExplorerUrls[0]}/tx/${hash}`;
