import { createPublicClient, http, parseAbiItem } from "viem";
import { arcTestnet } from "@/lib/web3";

export const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
export const ADDR = /^0x[0-9a-fA-F]{40}$/;
export const arcClient = () => createPublicClient({ chain: arcTestnet, transport: http() });
