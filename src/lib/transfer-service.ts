import { convertCurrencyAmount } from "@/lib/currency";
import { parseMajorAmountToMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
};

export type TransferResult = {
  transferId: string;
  fromAmountMinor: string;
  toAmountMinor: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: string;
};

export async function createTransfer(input: TransferInput, currentUserId: string): Promise<TransferResult> {
  const { fromAccountId, toAccountId } = input;

  if (!fromAccountId || !toAccountId) {
    throw new Error("Both accounts are required");
  }

  if (fromAccountId === toAccountId) {
    throw new Error("Cannot transfer to the same account");
  }

  const fromAmountMinor = parseMajorAmountToMinor(input.amount);

  return prisma.$transaction(async (tx) => {
    await Promise.all([fromAccountId, toAccountId].map(
      // https://github.com/prisma/prisma/issues/8580
      (id) => tx.$queryRaw`SELECT id FROM "Account" WHERE id = ${id} FOR UPDATE`),
    );

    const accounts = await tx.account.findMany({
      where: { id: { in: [fromAccountId, toAccountId] } },
    });
    const from = accounts.find((account) => account.id === fromAccountId);
    const to = accounts.find((account) => account.id === toAccountId);

    if (!from || !to) {
      throw new Error("Account not found");
    }

    if (from.userId !== currentUserId) {
      throw new Error("Not authorized to transfer from this account");
    }

    const conversion = await convertCurrencyAmount(fromAmountMinor, from.currency, to.currency);

    // update (single) would produce unwanted errors
    const debit = await tx.account.updateMany({
      where: {
        id: fromAccountId,
        userId: currentUserId,
        balanceMinor: { gte: fromAmountMinor },
      },
      data: { balanceMinor: { decrement: fromAmountMinor } },
    });

    if (debit.count !== 1) {
      throw new Error("Insufficient funds");
    }

    await tx.account.update({
      where: { id: toAccountId },
      data: { balanceMinor: { increment: conversion.amountMinor } },
    });

    const transfer = await tx.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        fromAmountMinor,
        toAmountMinor: conversion.amountMinor,
        fromCurrency: from.currency,
        toCurrency: to.currency,
        exchangeRate: conversion.rate.toString(),
      },
    });

    return {
      transferId: transfer.id,
      fromAmountMinor: fromAmountMinor.toString(),
      toAmountMinor: conversion.amountMinor.toString(),
      fromCurrency: from.currency,
      toCurrency: to.currency,
      exchangeRate: conversion.rate.toString(),
    };
  });
}
