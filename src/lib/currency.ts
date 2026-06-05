// MOCK MODULE FOR CURRENCY RATES

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.09, // 1 EUR = 1.09 USD
};

export async function fetchCurrencyRate(from: string, to: string): Promise<number> {
  const fromUsd = USD_RATES[from];
  const toUsd = USD_RATES[to];

  if (!fromUsd || !toUsd) {
    throw new Error(`Unsupported currency pair ${from}/${to}`);
  }

  return fromUsd / toUsd;
}

export function convertMinorUnits(amountMinor: bigint, rate: number): bigint {
  if (amountMinor < 0n) {
    throw new Error("Cannot convert a negative amount");
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid currency rate ${rate}`);
  }

  const result = Number(amountMinor) * rate;

  return BigInt(Math.round(result));
}

export async function convertCurrencyAmount(
  amountMinor: bigint,
  from: string,
  to: string,
): Promise<{ amountMinor: bigint; rate: number }> {
  const rate = await fetchCurrencyRate(from, to);

  return {
    amountMinor: convertMinorUnits(amountMinor, rate),
    rate,
  };
}
