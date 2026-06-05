import { runOnce } from "@/lib/idempotency";
import { createTransfer } from "@/lib/transfer-service";

// Фоновий обробник черги переказів.
//
// Гарантія доставки черги — at-least-once: одне й те саме повідомлення може
// прийти кілька разів (ретрай продюсера, ребаланс консюмера, повторна обробка
// після падіння воркера). Тому виклик переказу обгорнуто в runOnce за messageId.
export type TransferMessage = {
  messageId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
};

export async function handleTransferMessage(msg: TransferMessage) {
  // assumes fromAccountId is authenticated before sending the message
  return runOnce(msg.messageId, () =>
    createTransfer({
      fromAccountId: msg.fromAccountId,
      toAccountId: msg.toAccountId,
      amount: msg.amount,
    }, msg.fromAccountId),
  );
}
