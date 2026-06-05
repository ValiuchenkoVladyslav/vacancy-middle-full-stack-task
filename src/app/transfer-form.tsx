"use client";

import { useState } from "react";
import { transferMoney } from "./actions/transfer";

type Option = { id: string; label: string };

export function TransferForm({ accounts }: { accounts: Option[] }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState("");

  async function onSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setStatus("Sending...");
    try {
      await transferMoney({
        fromAccountId: from,
        toAccountId: to,
        amount: Number(amount),
      });
      setStatus("OK");
    } catch (err) {
      setStatus("Error: " + (err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 340 }}>
      <label>
        From
        <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        To
        <select value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <button type="submit">Transfer</button>
      <div>{status}</div>
    </form>
  );
}
