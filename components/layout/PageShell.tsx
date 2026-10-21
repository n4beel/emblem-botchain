"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Stationery shell: cream stock, a double rule, centred masthead.
 *
 * A credential is a printed object, so the page is laid out as one — centred title, double rules
 * above and below, and the honest scope of what a badge means stated in the footer where a
 * certificate would carry its small print. A badge here says only that one address attested
 * something about another, and the page should never imply more.
 */
export default function PageShell({ children, nav = [], title, description }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <header className="flex-shrink-0 mx-auto w-full px-6" style={{ maxWidth: "840px" }}>
        <div className="flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true">
              <circle cx="11" cy="9" r="7" fill="none" stroke="var(--accent)" strokeWidth="2" />
              <path d="M7 15 L5 23 L11 20 L17 23 L15 15" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span className="text-[20px] font-bold" style={{ fontFamily: "var(--font-cert)" }}>{app.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div style={{ width: "155px" }}><ConnectButton /></div>
          </div>
        </div>

        {nav.length > 1 && (
          <nav className="flex items-center justify-center gap-7 pb-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                  className="nav-link text-[13px] uppercase tracking-[0.12em] no-underline"
                  style={{ color: active ? "var(--accent)" : "var(--text-tertiary)" }}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex-1 mx-auto w-full px-6 py-9" style={{ maxWidth: "720px" }}>
        {(title || description) && (
          <div className="text-center sealed-rule pt-8 pb-2 mb-8" style={{ borderBottom: "3px double var(--border-strong)", paddingBottom: "28px" }}>
            {title && <h1 className="text-[34px] md:text-[40px]" style={{ color: "var(--text-primary)" }}>{title}</h1>}
            {description && (
              <p className="mt-3 text-[15px] mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "50ch" }}>
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </main>

      <footer className="flex-shrink-0 mx-auto w-full px-6 py-7" style={{ maxWidth: "720px", borderTop: "1px solid var(--border-subtle)" }}>
        <p className="text-[12px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          A badge records that one address attested a label about another, at a point in time. It is
          not proof of anything beyond that, and anyone may issue one.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
          <BuiltOnBotChain style={{ color: "var(--text-secondary)" }} />
          <a href="https://botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>botchain.ai</a>
          <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>BOT Chain Explorer</a>
        </div>
      </footer>
    </div>
  );
}
