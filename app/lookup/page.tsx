import PageShell from "@/components/layout/PageShell";
import BadgeLookup from "@/components/emblem/BadgeLookup";
import { NAV } from "@/lib/nav";

export const metadata = {
  title: "Look up a badge — Emblem",
  description: "Read any Emblem credential on BOT Chain by number, or see what an address holds.",
};

export default function LookupPage() {
  return (
    <PageShell nav={NAV} title="Look up a badge" description="By number, or by the address that holds it.">
      <BadgeLookup />
    </PageShell>
  );
}
