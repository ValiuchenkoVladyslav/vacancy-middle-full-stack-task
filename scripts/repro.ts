import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FROM_ACCOUNT_ID = "acc-alice";
const TO_ACCOUNT_ID = "acc-bob";
const CONCURRENT_TRANSFERS = 10;
const AMOUNT = 150;

async function main() {
  await resetDemoData();

  const barrier = createBarrier(CONCURRENT_TRANSFERS);
  const attempts = Array.from({ length: CONCURRENT_TRANSFERS }, (_, index) =>
    initialTransferMoneyWithForcedRace(
      {
        fromAccountId: FROM_ACCOUNT_ID,
        toAccountId: TO_ACCOUNT_ID,
        amount: AMOUNT,
      },
      barrier,
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
  console.log(`Succeeded according to caller: ${successful.length}`);
  console.log(`Failed according to caller: ${failed.length}`);
  console.log(`Alice balance: ${alice.balance.toFixed(2)} ${alice.currency}`);
  console.log(`Bob balance: ${bob.balance.toFixed(2)} ${bob.currency}`);
  console.log(`Transfer records: ${transferCount}`);
  console.log("");
  console.log("A safe implementation would allow only 6 transfers:");
  console.log("  Alice balance: 100.00 USD");
  console.log("  Bob balance: 1400.00 USD");
  console.log("  Transfer records: 6");
  console.log("");

  const reproduced =
    successful.length !== 6 ||
    failed.length !== 4 ||
    alice.balance !== 100 ||
    bob.balance !== 1400 ||
    transferCount !== 6;

  if (!reproduced) {
    throw new Error("Race was not reproduced. Try increasing CONCURRENT_TRANSFERS.");
  }

  console.log("Race reproduced: transfer records and balances do not describe the same money movement.");
}

type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
};

// This mirrors the initial transferMoney implementation. The barrier is only here
// to make all concurrent attempts pause after reading the same stale balances.
async function initialTransferMoneyWithForcedRace(input: TransferInput, waitForOtherReaders: () => Promise<void>) {
  const { fromAccountId, toAccountId, amount } = input;

  const from = await prisma.account.findUnique({ where: { id: fromAccountId } });
  const to = await prisma.account.findUnique({ where: { id: toAccountId } });

  if (!from || !to) {
    throw new Error("Account not found");
  }

  if (from.balance < amount) {
    throw new Error("Insufficient funds");
  }

  await waitForOtherReaders();

  try {
    await prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: from.balance - amount },
    });

    await prisma.account.update({
      where: { id: toAccountId },
      data: { balance: to.balance + amount },
    });

    await prisma.transfer.create({
      data: { fromAccountId, toAccountId, amount },
    });

    return { success: true };
  } catch (error) {
    console.log("Transfer failed", input, error);
    return { success: true };
  }
}

async function resetDemoData() {
  await prisma.idempotencyRecord.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.account.deleteMany();

  await prisma.account.createMany({
    data: [
      { id: FROM_ACCOUNT_ID, userId: "user-1", ownerName: "Alice", balance: 1000, currency: "USD" },
      { id: TO_ACCOUNT_ID, userId: "user-2", ownerName: "Bob", balance: 500, currency: "USD" },
      { id: "acc-carol", userId: "user-3", ownerName: "Carol", balance: 0, currency: "EUR" },
    ],
  });
}

function createBarrier(size: number) {
  let waiting = 0;
  let release: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    waiting += 1;
    if (waiting === size) {
      release?.();
    }

    await ready;
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
