"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Address } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContracts } from "wagmi";
import Panel from "@/components/ui/Panel";
import Spinner from "@/components/ui/Spinner";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { emblemAbi } from "@/lib/botchain/abi";
import { formatIssuedAt } from "@/lib/emblem";

/**
 * Every badge this wallet holds, and every badge it has issued.
 *
 * A badge is non-transferable, so the set a wallet holds never changes behind your back — but
 * nothing tells a recipient their token number, and the contract keeps no per-address index. The
 * `BadgeIssued` event indexes both the issuer and the recipient, so two filtered log queries give
 * both halves: what has been said about you, and what you have said about others.
 */
type IssuedEvent = Extract<(typeof emblemAbi)[number], { type: "event"; name: "BadgeIssued" }>;

/** Taken from the ABI itself; re-typing the signature here is how the two drift apart. */
const ISSUED = emblemAbi.find(
  (item): item is IssuedEvent => item.type === "event" && item.name === "BadgeIssued",
)!;

interface Row {
  tokenId: bigint;
  issuer: Address;
  recipient: Address;
  label: string;
  issuedAt?: bigint;
}

export default function MyBadges() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient(); // stable-hook-result

  const [held, setHeld] = useState<Row[] | null>(null);
  const [given, setGiven] = useState<Row[]>([]);
  const [failed, setFailed] = useState(false);

  const ready = Boolean(address) && isBotChainId(chainId) && isDeployed(chainId);
  const deployment = ready ? getDeployment(chainId) : null;
  const contract = deployment?.address;
  const fromBlock = deployment?.deployBlock;

  const scanned = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !publicClient || !address || !contract || fromBlock === undefined) return;
    const key = `${chainId}:${address.toLowerCase()}`;
    if (scanned.current === key) return;
    scanned.current = key;

    let cancelled = false;
    void (async () => {
      try {
        const [toMe, byMe] = await Promise.all([
          publicClient.getLogs({ address: contract, event: ISSUED, args: { recipient: address }, fromBlock }),
          publicClient.getLogs({ address: contract, event: ISSUED, args: { issuer: address }, fromBlock }),
        ]);
        if (cancelled) return;

        const toRow = (logs: typeof toMe): Row[] =>
          logs
            .map((l) => ({
              tokenId: l.args.tokenId as bigint,
              issuer: l.args.issuer as Address,
              recipient: l.args.recipient as Address,
              label: (l.args.label as string) ?? "",
            }))
            .filter((r) => r.tokenId !== undefined)
            .sort((a, b) => (a.tokenId < b.tokenId ? 1 : -1));

        setHeld(toRow(toMe));
        setGiven(toRow(byMe));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, publicClient, address, contract, fromBlock, chainId]);

  const allIds = useMemo(
    () => [...(held ?? []), ...given].map((r) => r.tokenId),
    [held, given],
  );

  const times = useReadContracts({
    contracts: allIds.map((id) => ({
      address: contract,
      abi: emblemAbi,
      functionName: "badgeOf" as const,
      args: [id] as const,
    })),
    query: { enabled: allIds.length > 0 && Boolean(contract) },
  });

  const issuedAtFor = (id: bigint): bigint | undefined => {
    const i = allIds.findIndex((x) => x === id);
    if (i < 0) return undefined;
    const b = times.data?.[i]?.result as { issuedAt?: bigint } | undefined;
    return b?.issuedAt;
  };

  if (!ready) return null;

  if (failed) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Could not list your badges — the node refused the log query. They are still reachable by
          number or by address below.
        </p>
      </Panel>
    );
  }

  if (held === null) {
    return (
      <Panel>
        <Spinner label="Finding your badges" />
      </Panel>
    );
  }

  if (held.length === 0 && given.length === 0) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          No badges yet for this wallet — none issued to it, and none issued by it.
        </p>
      </Panel>
    );
  }

  const list = (rows: Row[], side: "held" | "given") => (
    <ul className="flex flex-col gap-2 list-none p-0 m-0">
      {rows.map((r) => {
        const when = issuedAtFor(r.tokenId);
        const other = side === "held" ? r.issuer : r.recipient;
        return (
          <li
            key={`${side}-${r.tokenId.toString()}`}
            className="flex items-baseline gap-3 flex-wrap py-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <Link
              href={`/lookup?q=${r.tokenId.toString()}`}
              className="mono text-[13px] underline"
              style={{ color: "var(--accent)" }}
            >
              #{r.tokenId.toString()}
            </Link>
            <span className="text-[13px] flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
              {r.label}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {side === "held" ? "from" : "to"}{" "}
              <a
                href={addressUrl(chainId, other)}
                target="_blank"
                rel="noreferrer"
                className="mono underline"
              >
                {other.slice(0, 8)}…{other.slice(-6)}
              </a>
            </span>
            {when !== undefined && when > 0n && (
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {formatIssuedAt(Number(when))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      {held.length > 0 && (
        <Panel>
          <div className="flex flex-col gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Issued to you ({held.length})
            </span>
            {list(held, "held")}
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Non-transferable. These stay with this address — nobody can move or revoke them,
              including whoever issued them.
            </p>
          </div>
        </Panel>
      )}

      {given.length > 0 && (
        <Panel>
          <div className="flex flex-col gap-3">
            <span
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Issued by you ({given.length})
            </span>
            {list(given, "given")}
          </div>
        </Panel>
      )}
    </div>
  );
}
