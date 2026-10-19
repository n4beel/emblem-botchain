"use client";

import { useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { emblemAbi } from "@/lib/botchain/abi";

type Badge = { issuer: Address; recipient: Address; label: string; issuedAt: bigint };

/**
 * Look a badge up, by token number or by holder.
 *
 * Which lookup to run is decided by what was typed — an address is unmistakable, anything else is
 * a number — rather than by a mode switch the user has to find.
 *
 * Reading badges for an address costs one call per token because the contract keeps no
 * per-owner index; that is the deliberate storage trade, and the cost lands here rather than on
 * everyone who ever issues one.
 */
export default function BadgeLookup() {
  const chainId = useChainId();
  const [typed, setTyped] = useState("");

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;
  const ready = isBotChainId(chainId) && isDeployed(chainId);
  const base = { address: deployment?.address, abi: emblemAbi } as const;

  const query = useMemo(() => {
    const v = typed.trim();
    if (v === "") return null;
    if (isAddress(v)) return { kind: "holder" as const, address: v as Address };
    if (/^\d+$/.test(v)) return { kind: "token" as const, id: BigInt(v) };
    return { kind: "invalid" as const };
  }, [typed]);

  const single = useReadContracts({
    contracts:
      query?.kind === "token"
        ? [
            { ...base, functionName: "badgeOf" as const, args: [query.id] },
            { ...base, functionName: "ownerOf" as const, args: [query.id] },
          ]
        : [],
    query: { enabled: ready && query?.kind === "token" },
  });

  const held = useReadContract({
    ...base,
    functionName: "balanceOf",
    args: query?.kind === "holder" ? [query.address] : undefined,
    query: { enabled: ready && query?.kind === "holder" },
  });

  const count = held.data as bigint | undefined;

  // No per-owner index on chain, so scan the first tokens and filter by holder. Bounded on
  // purpose: an unbounded scan from a browser is a hung tab, not a thorough search.
  const SCAN = 60n;
  const scan = useReadContracts({
    contracts:
      query?.kind === "holder" && count !== undefined && count > 0n
        ? Array.from({ length: Number(SCAN) }, (_, i) => ({
            ...base, functionName: "badgeOf" as const, args: [BigInt(i)],
          }))
        : [],
    query: { enabled: ready && query?.kind === "holder" && (count ?? 0n) > 0n },
  });

  const mine = useMemo(() => {
    if (query?.kind !== "holder" || !scan.data) return [];
    return scan.data
      .map((r, i) => ({ id: BigInt(i), badge: r.result as Badge | undefined }))
      .filter((x) => x.badge && x.badge.recipient.toLowerCase() === query.address.toLowerCase());
  }, [scan.data, query]);

  const when = (t: bigint) =>
    new Date(Number(t) * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <Input label="Badge number or holder address" value={typed} onChange={(e) => setTyped(e.target.value)}
          placeholder="0  or  0x…" mono hint="No wallet needed to look one up." />
      </Panel>

      {!ready && query && (
        <Panel><p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          No registry is configured for this network.
        </p></Panel>
      )}

      {ready && query?.kind === "invalid" && (
        <Panel><p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          That is neither a badge number nor an address.
        </p></Panel>
      )}

      {ready && query?.kind === "token" && single.isLoading && <Panel><Spinner label="Reading the chain" /></Panel>}

      {/* Neither loading nor successful means the call failed outright — without this the page
          renders nothing at all and reads as "no such badge", which is a different claim. */}
      {ready && query?.kind === "token" && single.isError && (
        <Panel>
          <p className="text-[13px]" style={{ color: "var(--warning)" }}>
            Could not reach the chain. This badge is unknown, not missing — try again.
          </p>
        </Panel>
      )}

      {ready && query?.kind === "token" && single.isSuccess && (() => {
        const badge = single.data?.[0]?.result as Badge | undefined;
        const owner = single.data?.[1]?.result as Address | undefined;
        if (!badge || badge.issuedAt === 0n) {
          return <Panel><p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>No badge with that number.</p></Panel>;
        }
        return (
          <Panel>
            <div className="flex flex-col gap-4 text-center">
              <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Badge #{typed.trim()}</p>
              <p className="text-[26px]" style={{ fontFamily: "var(--font-cert)", color: "var(--text-primary)" }}>{badge.label}</p>
              <div className="sealed-rule pt-4 flex flex-col gap-3 text-left">
                <Row label="Issued to" value={owner ?? badge.recipient} chainId={chainId} />
                <Row label="Issued by" value={badge.issuer} chainId={chainId} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-tertiary)" }}>On</p>
                  <p className="mono text-[12px]">{when(badge.issuedAt)}</p>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed pt-2" style={{ color: "var(--text-tertiary)" }}>
                Non-transferable. It records that this issuer attested this label about this address,
                on that date — and nothing more.
              </p>
            </div>
          </Panel>
        );
      })()}

      {ready && query?.kind === "holder" && (held.isLoading || scan.isLoading) && (
        <Panel><Spinner label="Reading the chain" /></Panel>
      )}

      {ready && query?.kind === "holder" && held.isSuccess && (count ?? 0n) === 0n && (
        <Panel><p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>That address holds no badges.</p></Panel>
      )}

      {ready && query?.kind === "holder" && mine.length > 0 && (
        <div className="flex flex-col gap-4">
          {mine.map(({ id, badge }) => (
            <Panel key={id.toString()}>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--accent)" }}>#{id.toString()}</p>
                <p className="text-[20px]" style={{ fontFamily: "var(--font-cert)" }}>{badge!.label}</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  issued by <span className="mono">{badge!.issuer}</span> on {when(badge!.issuedAt)}
                </p>
              </div>
            </Panel>
          ))}
          {(count ?? 0n) > BigInt(mine.length) && (
            <p className="text-[11px] text-center" style={{ color: "var(--text-tertiary)" }}>
              Showing the first {SCAN.toString()} badge numbers. This address holds {count?.toString()}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, chainId }: { label: string; value: Address; chainId: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      <a href={addressUrl(chainId, value)} target="_blank" rel="noreferrer"
        className="mono text-[12px] break-all underline" style={{ color: "var(--text-secondary)" }}>
        {value}
      </a>
    </div>
  );
}
