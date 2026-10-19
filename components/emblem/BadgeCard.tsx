import Link from "next/link";
import Panel from "@/components/ui/Panel";
import { addressUrl } from "@/lib/botchain/chain";
import { formatIssuedAt, type Badge } from "@/lib/emblem";

/**
 * Display a credential badge with attestation details and honest boundaries.
 */
export default function BadgeCard({
  badge,
  chainId,
  showLink = false,
}: {
  badge: Badge;
  chainId: number;
  showLink?: boolean;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="text-[11px] uppercase tracking-[0.06em] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Credential Badge {badge.tokenId ? `#${badge.tokenId.toString()}` : ""}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            Soulbound · Non-Transferable
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.06em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Attestation Label
          </span>
          <div
            className="text-[16px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {badge.label}
          </div>
        </div>

        <Row label="Recipient (Owner)">
          <a
            href={addressUrl(chainId, badge.recipient)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] break-all underline"
            style={{ color: "var(--accent)" }}
          >
            {badge.recipient}
          </a>
        </Row>

        <Row label="Attested by (Issuer)">
          <a
            href={addressUrl(chainId, badge.issuer)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] break-all underline"
            style={{ color: "var(--text-secondary)" }}
          >
            {badge.issuer}
          </a>
        </Row>

        <Row label="Issued at">
          <span className="font-mono text-[12px]" style={{ color: "var(--text-primary)" }}>
            {formatIssuedAt(badge.issuedAt)}
          </span>
        </Row>

        <div
          className="text-[11px] leading-relaxed pt-3 border-t"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}
        >
          This badge records only that{" "}
          <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {badge.issuer}
          </span>{" "}
          attested &lsquo;{badge.label}&rsquo; about{" "}
          <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {badge.recipient}
          </span>
          . It does not imply any authority or authenticity beyond that attestation.
        </div>

        {showLink && badge.tokenId && (
          <Link
            href={`/badge/${badge.tokenId.toString()}`}
            className="text-[11px] uppercase tracking-[0.04em] underline"
            style={{ color: "var(--accent)" }}
          >
            View standalone badge →
          </Link>
        )}
      </div>
    </Panel>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-[0.06em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
