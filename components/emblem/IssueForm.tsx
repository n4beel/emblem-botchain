"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import BadgeCard from "@/components/emblem/BadgeCard";
import { isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { emblemAbi } from "@/lib/botchain/abi";
import {
  labelByteLength,
  MAX_LABEL_BYTES,
  type Badge,
} from "@/lib/emblem";

export default function IssueForm() {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [label, setLabel] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [createdTokenId, setCreatedTokenId] = useState<bigint | null>(null);
  const [issuedBadge, setIssuedBadge] = useState<Badge | null>(null);

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  const settledHash = useRef<Hex | null>(null);

  useEffect(() => {
    if (!hash || settledHash.current === hash) return;
    if (!receipt.isSuccess && !receipt.isError) return;

    settledHash.current = hash;

    if (receipt.isSuccess) {
      setStage("confirmed");
      let idFromLog: bigint | null = null;
      if (receipt.data?.logs) {
        try {
          const logs = parseEventLogs({
            abi: emblemAbi,
            logs: receipt.data.logs,
            eventName: "BadgeIssued",
          });
          if (logs.length > 0 && logs[0].args.tokenId !== undefined) {
            idFromLog = logs[0].args.tokenId;
          }
        } catch {
          // Event decoding fallback
        }
      }
      setCreatedTokenId(idFromLog);
      if (address && recipient && label) {
        setIssuedBadge({
          tokenId: idFromLog ?? undefined,
          issuer: address,
          recipient: recipient.trim() as Address,
          label: label.trim(),
          issuedAt: Math.floor(Date.now() / 1000),
        });
      }
      toast("success", "Badge issued", "The credential badge is now permanently recorded.");
    } else {
      setStage("failed");
      toast("error", "Transaction failed", "Nothing was recorded. Check the explorer and try again.");
    }
  }, [hash, receipt.isSuccess, receipt.isError, receipt.data?.logs, toast, address, recipient, label]);

  const labelBytes = labelByteLength(label);
  const labelTooLong = labelBytes > MAX_LABEL_BYTES;
  const trimmedRecipient = recipient.trim();
  const validRecipient =
    isAddress(trimmedRecipient) &&
    trimmedRecipient.toLowerCase() !== "0x0000000000000000000000000000000000000000";
  const recipientError =
    trimmedRecipient.length > 0 && !validRecipient
      ? "Enter a valid 42-character 0x address"
      : undefined;

  const canSubmit =
    validRecipient &&
    label.trim().length > 0 &&
    !labelTooLong &&
    (stage === "idle" || stage === "failed");

  const handleIssue = useCallback(async () => {
    if (!deployment || !isBotChainId(chainId) || !validRecipient || labelTooLong || !label.trim()) {
      return;
    }

    setStage("signing");
    setHash(null);
    settledHash.current = null;
    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: emblemAbi,
        functionName: "issue",
        args: [trimmedRecipient as Address, label.trim()],
        chainId,
      });
      setHash(txHash);
      setStage("pending");
    } catch (err) {
      setStage("idle");

      const reverted =
        err instanceof BaseError
          ? err.walk((e) => e instanceof ContractFunctionRevertedError)
          : null;

      if (reverted instanceof ContractFunctionRevertedError) {
        const error = reverted.data;
        if (error?.errorName === "ZeroAddress") {
          toast("error", "Zero address", "Recipient cannot be the zero address.");
          return;
        }
        if (error?.errorName === "LabelTooLong") {
          toast("error", "Label too long", `Keep it under ${MAX_LABEL_BYTES} bytes.`);
          return;
        }
      }

      const message = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      if (/rejected|denied/i.test(message)) {
        toast("info", "Cancelled", "Nothing was sent.");
      } else {
        toast("error", "Could not issue badge", message);
      }
    }
  }, [deployment, chainId, validRecipient, trimmedRecipient, label, labelTooLong, writeContractAsync, toast]);

  const handleReset = () => {
    setRecipient("");
    setLabel("");
    setStage("idle");
    setHash(null);
    setCreatedTokenId(null);
    setIssuedBadge(null);
    settledHash.current = null;
  };

  // Checked FIRST per §3.3: order post-transaction branches so success wins
  if (stage === "confirmed") {
    return (
      <div className="flex flex-col gap-4">
        {issuedBadge && (
          <BadgeCard
            badge={
              createdTokenId
                ? { ...issuedBadge, tokenId: createdTokenId }
                : issuedBadge
            }
            chainId={chainId}
          />
        )}
        <Panel>
          <div className="flex flex-col gap-3">
            <TxStatus stage="confirmed" hash={hash} confirmedLabel="Badge issued on chain" />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              {createdTokenId ? (
                <Link
                  href={`/badge/${createdTokenId.toString()}`}
                  className="text-[11px] uppercase tracking-[0.04em] underline"
                  style={{ color: "var(--accent)" }}
                >
                  Open badge #{createdTokenId.toString()} page →
                </Link>
              ) : (
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  Badge minted successfully
                </span>
              )}
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Issue another badge
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Required Honest Warning */}
      <Panel>
        <div className="flex gap-3 items-start">
          <span
            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: "var(--accent)" }}
          />
          <div className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.06em] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Attestation Scope
            </span>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              A badge records that your address attested this label about the recipient. It does not
              prove authority or authenticity. Do not issue a badge that overclaims.
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4">
          <Input
            label="Recipient address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            mono
            disabled={stage === "signing" || stage === "pending"}
            error={recipientError}
            hint="The BOT Chain address receiving this non-transferable badge."
          />

          <Input
            label="Attestation label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Core Protocol Contributor"
            disabled={stage === "signing" || stage === "pending"}
            error={labelTooLong ? `${labelBytes} of ${MAX_LABEL_BYTES} bytes` : undefined}
            hint={
              labelTooLong
                ? undefined
                : `${labelBytes} / ${MAX_LABEL_BYTES} bytes. Stored on chain and permanently associated with this badge.`
            }
          />

          {(stage === "idle" || stage === "failed") && (
            <Button onClick={handleIssue} disabled={!canSubmit}>
              Issue Badge
            </Button>
          )}

          <TxStatus
            stage={stage}
            hash={hash}
            failedLabel="Transaction failed — no badge was issued."
          />
        </div>
      </Panel>
    </div>
  );
}
