import { createTransfer } from "../src/lib/transfer-service";
import { formatMinorAmount } from "../src/lib/money";
import { prisma } from "../src/lib/prisma";
import assert from "node:assert";

const CURRENT_USER_ID = "user-1";
const FROM_ACCOUNT_ID = "acc-alice";
const TO_ACCOUNT_ID = "acc-bob";
const CONCURRENT_TRANSFERS = 10;
const AMOUNT = 150;

async function main() {
  await resetDemoData();

  const attempts = Array.from({ length: CONCURRENT_TRANSFERS }, (_, index) =>
    createTransfer(
      {
        fromAccountId: FROM_ACCOUNT_ID,
        toAccountId: TO_ACCOUNT_ID,
        amount: AMOUNT,
      },
      CURRENT_USER_ID,
    ).then(
      (result) => ({ index, status: "fulfilled" as const, result }),
      (error) => ({ index, status: "rejected" as const, error: error as Error }),
    ),
  );

  const results = await Promise.all(attempts);
  const successful = results.filter((result) => result.status === "fulfilled");
  const failed = results.filter((result) => result.status === "rejected");

  const [alice, bob, transferCount] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { id: FROM_ACCOUNT_ID } }),
    prisma.account.findUniqueOrThrow({ where: { id: TO_ACCOUNT_ID } }),
    prisma.transfer.count(),
  ]);

  console.log(`Concurrent attempts: ${CONCURRENT_TRANSFERS} x ${AMOUNT}.00 USD`);
  console.log(`Succeeded: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Alice: ${formatMinorAmount(alice.balanceMinor, alice.currency)}`);
  console.log(`Bob: ${formatMinorAmount(bob.balanceMinor, bob.currency)}`);
  console.log(`Transfer records: ${transferCount}`);

  for (const result of failed) {
    console.log(`Attempt ${result.index + 1} failed: ${result.error.message}`);
  }

  assert.equal(successful.length, 6, "successful transfer count");
  assert.equal(failed.length, 4, "failed transfer count");
  assert.equal(alice.balanceMinor, 10000n, "Alice final balance");
  assert.equal(bob.balanceMinor, 140000n, "Bob final balance");
  assert.equal(transferCount, 6, "transfer record count");

  console.log("Repro passed: concurrent transfers did not overspend or lose updates.");
}

async function resetDemoData() {
  await prisma.idempotencyRecord.deleteMany();
  await prisma.transfer.deleteMany();

  await prisma.account.upsert({
    where: { id: FROM_ACCOUNT_ID },
    update: { userId: CURRENT_USER_ID, ownerName: "Alice", balanceMinor: 100000n, currency: "USD" },
    create: { id: FROM_ACCOUNT_ID, userId: CURRENT_USER_ID, ownerName: "Alice", balanceMinor: 100000n, currency: "USD" },
  });

  await prisma.account.upsert({
    where: { id: TO_ACCOUNT_ID },
    update: { userId: "user-2", ownerName: "Bob", balanceMinor: 50000n, currency: "USD" },
    create: { id: TO_ACCOUNT_ID, userId: "user-2", ownerName: "Bob", balanceMinor: 50000n, currency: "USD" },
  });

  await prisma.account.upsert({
    where: { id: "acc-carol" },
    update: { userId: "user-3", ownerName: "Carol", balanceMinor: 0n, currency: "EUR" },
    create: { id: "acc-carol", userId: "user-3", ownerName: "Carol", balanceMinor: 0n, currency: "EUR" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
