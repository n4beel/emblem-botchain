import PageShell from "@/components/layout/PageShell";
import BotChainGate from "@/components/botchain/BotChainGate";
import IssueForm from "@/components/emblem/IssueForm";
import { NAV } from "@/lib/nav";

export default function Home() {
  return (
    <PageShell
      nav={NAV}
      title="Issue a credential"
      description="A badge that cannot be sold, transferred or moved. It stays with the address it was issued to, and records who issued it."
    >
      <BotChainGate noWalletNote="You can look up any badge here without a wallet; issuing one needs a wallet to sign.">
        <IssueForm />
      </BotChainGate>
    </PageShell>
  );
}
