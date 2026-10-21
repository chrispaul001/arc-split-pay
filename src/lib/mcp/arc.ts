import { createPublicClient, fallback, http, parseAbiItem } from "viem";
import { ARC_RPC_URLS, arcTestnet } from "@/lib/web3";

export const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
export const ADDR = /^0x[0-9a-fA-F]{40}$/;
export const arcClient = () =>
  createPublicClient({ chain: arcTestnet, transport: fallback(ARC_RPC_URLS.map((u) => http(u))) });
