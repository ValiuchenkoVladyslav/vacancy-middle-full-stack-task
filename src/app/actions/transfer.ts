"use server";

import { revalidatePath } from "next/cache";
import { createTransfer, type TransferInput } from "@/lib/transfer-service";
import { auth } from "@/lib/auth";

// Внутрішній P2P-переказ між рахунками.
// Цей код зараз у проді. Він "працює" на демо, але вже були інциденти.
export async function transferMoney(input: TransferInput) {
  const session = await auth();

  await createTransfer(input, session.userId);

  revalidatePath("/");
}
