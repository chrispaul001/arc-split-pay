// On-chain configuration for CoindeccPay (Arc Network Testnet).

import { defineChain } from "viem";

export const COINDECC_PAY_ADDRESS = "0xbD13692792b8356c142c93Ef5B114166e4Cd2Acd" as const;

/** USDC token used by the CoindeccPay contract on Arc testnet. */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

/** Tokens accepted by split checkout on Arc Testnet (addresses from Circle docs; decimals read on-chain). */
export const CHECKOUT_TOKENS = [
  { symbol: "USDC", name: "USD Coin", address: USDC_ADDRESS, decimals: 6 },
  { symbol: "EURC", name: "Euro Coin", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  { symbol: "cirBTC", name: "Circle Wrapped Bitcoin", address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8 },
] as const;
export type CheckoutToken = (typeof CHECKOUT_TOKENS)[number];

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
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** Active split configured on-chain by the contract owner (50/50 split). */
export const DEFAULT_SPLIT_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

// Verified ABI (Arcscan): pay(bytes32 splitId, uint256 amount)
export const COINDECC_PAY_ABI = [
  {
    type: "function",
    name: "pay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "splitId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getSplit",
    stateMutability: "view",
    inputs: [{ name: "splitId", type: "bytes32" }],
    outputs: [
      { name: "recipients", type: "address[]" },
      { name: "sharesBps", type: "uint16[]" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const explorerTx = (hash: string) => `${ARC_TESTNET.blockExplorerUrls[0]}/tx/${hash}`;

/** Merchant-deployed split router: pulls `total` USDC once and pays every recipient by bps, atomically. */
export const SPLIT_ROUTER_ADDRESS = "0xDa3cfF59e730498d5c0579FE0DD913316c3E189A" as const;

// splitToken(address token, uint256 total, (address recipient, uint256 bps)[] shares) — shares must sum to 10000.
export const SPLIT_ROUTER_ABI = [
  {
    type: "function",
    name: "splitToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      {
        name: "shares",
        type: "tuple[]",
        components: [
          { name: "recipient", type: "address" },
          { name: "bps", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
] as const;
