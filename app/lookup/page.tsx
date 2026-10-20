import PageShell from "@/components/layout/PageShell";
import BadgeLookup from "@/components/emblem/BadgeLookup";
import MyBadges from "@/components/emblem/MyBadges";
import { NAV } from "@/lib/nav";

export const metadata = {
  title: "Badges — Emblem",
  description: "Your Emblem credentials on BOT Chain, and any badge by number or holder.",
};

export default function LookupPage() {
  return (
    <PageShell
      nav={NAV}
      title="Badges"
      description="What has been said about you, what you have said about others, and anyone else's."
    >
      <div className="flex flex-col gap-5">
        {/* Yours first: nothing tells a recipient their token number. */}
        <MyBadges />
        <BadgeLookup />
      </div>
    </PageShell>
  );
}
