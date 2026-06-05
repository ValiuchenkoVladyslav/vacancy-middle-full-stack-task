import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.idempotencyRecord.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.account.deleteMany();

  await prisma.account.createMany({
    data: [
      { id: "acc-alice", userId: "user-1", ownerName: "Alice", balanceMinor: 100000n, currency: "USD" },
      { id: "acc-bob", userId: "user-2", ownerName: "Bob", balanceMinor: 50000n, currency: "USD" },
      { id: "acc-carol", userId: "user-3", ownerName: "Carol", balanceMinor: 0n, currency: "EUR" },
    ],
  });

  console.log("Seeded accounts:");
  console.log("  Alice  (acc-alice) — 1000 USD  [userId: user-1, поточний користувач]");
  console.log("  Bob    (acc-bob)   —  500 USD  [userId: user-2]");
  console.log("  Carol  (acc-carol) —    0 EUR  [userId: user-3]");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
