export const MINOR_UNITS = 100n;
export const MAX_MINOR_UNITS = 9_000_000_000_000_000_000n;

export function parseMajorAmountToMinor(amount: number): bigint {
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be finite");
  }

  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const value = amount.toString();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error("Amount must have at most 2 decimal places");
  }

  const [whole, fraction = ""] = value.split(".");
  const minor = BigInt(whole) * MINOR_UNITS + BigInt(fraction.padEnd(2, "0"));

  if (minor <= 0n || minor > MAX_MINOR_UNITS) {
    throw new Error("Amount is outside supported limits");
  }

  return minor;
}

export function formatMinorAmount(amountMinor: bigint, currency: string): string {
  const sign = amountMinor < 0n ? "-" : "";
  const absolute = amountMinor < 0n ? -amountMinor : amountMinor;
  const whole = absolute / MINOR_UNITS;
  const fraction = (absolute % MINOR_UNITS).toString().padStart(2, "0");

  return `${sign}${whole}.${fraction} ${currency}`;
}
