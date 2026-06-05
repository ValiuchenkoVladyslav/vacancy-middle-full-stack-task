import { formatMinorAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { TransferForm } from "./transfer-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const accounts = await prisma.account.findMany({ orderBy: { ownerName: "asc" } });

  return (
    <main>
      <h1>Internal Transfers</h1>

      <h2>Accounts</h2>
      <ul>
        {accounts.map((a) => (
          <li key={a.id}>
            <b>{a.ownerName}</b> <code>({a.id})</code> - {formatMinorAmount(a.balanceMinor, a.currency)}
          </li>
        ))}
      </ul>

      <h2>New transfer</h2>
      <TransferForm
        accounts={accounts.map((a) => ({
          id: a.id,
          label: `${a.ownerName} - ${formatMinorAmount(a.balanceMinor, a.currency)}`,
        }))}
      />
    </main>
  );
}
