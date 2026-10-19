import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { activeBotChain, type BotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { emblemAbi } from "@/lib/botchain/abi";

export type Badge = {
  tokenId?: bigint;
  issuer: Address;
  recipient: Address;
  label: string;
  issuedAt: number;
};

export const MAX_LABEL_BYTES = 200;

const encoder = new TextEncoder();

export function labelByteLength(label: string): number {
  return encoder.encode(label).length;
}

export function truncateLabel(label: string, max = MAX_LABEL_BYTES): string {
  if (labelByteLength(label) <= max) return label;
  let out = label;
  while (out.length > 0 && labelByteLength(out) > max) {
    out = Array.from(out).slice(0, -1).join("");
  }
  return out;
}

export function formatIssuedAt(issuedAt: number): string {
  return new Date(issuedAt * 1000).toUTCString();
}

export function readClient(): PublicClient {
  return createPublicClient({
    chain: activeBotChain,
    transport: http(undefined, { timeout: 15_000 }),
  }) as PublicClient;
}

export async function readBadge(
  client: PublicClient,
  chainId: BotChainId,
  tokenId: bigint,
): Promise<Badge | null> {
  if (!isDeployed(chainId)) return null;

  try {
    const data = await client.readContract({
      address: getDeployment(chainId).address,
      abi: emblemAbi,
      functionName: "badgeOf",
      args: [tokenId],
    });

    if (!data || data.recipient === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return {
      tokenId,
      issuer: data.issuer,
      recipient: data.recipient,
      label: data.label,
      issuedAt: Number(data.issuedAt),
    };
  } catch {
    return null;
  }
}
