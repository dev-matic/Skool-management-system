import Decimal from "decimal.js";

/**
 * Money helpers. All amounts are Ghana cedis (GHS) with 2 decimal places.
 *
 * Rules:
 * - Never use JavaScript numbers for money: 0.1 + 0.2 !== 0.3.
 * - Postgres `numeric` values arrive as strings; pass them to parseMoney().
 * - Rounding is half-up (0.005 -> 0.01), the usual rule for receipts.
 */
export const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Money = InstanceType<typeof Money>;

export class MoneyFormatError extends Error {
  constructor(input: string) {
    super(`Not a valid money amount: "${input}"`);
    this.name = "MoneyFormatError";
  }
}

const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const CURRENCY_PREFIX = /^(GH₵|GHS|GHC|¢)\s*/i;

/**
 * Parses user input or a database value into Money.
 * Accepts "1500", "1,500.50", "GH₵ 1,500.5", "GHS1500". Rejects more than
 * 2 decimal places rather than silently rounding what the user typed.
 */
export function parseMoney(input: string): Money {
  const cleaned = input.trim().replace(CURRENCY_PREFIX, "").replace(/,/g, "");
  if (!AMOUNT_PATTERN.test(cleaned)) {
    throw new MoneyFormatError(input);
  }
  return new Money(cleaned);
}

/** Rounds to 2 decimal places and returns a plain string for storage, e.g. "1500.50". */
export function toMoneyString(amount: Money): string {
  return amount.toDecimalPlaces(2).toFixed(2);
}

/** Formats for display and printing, e.g. "GH₵ 1,500.50" or "-GH₵ 20.00". */
export function formatGHS(amount: Money): string {
  const rounded = amount.toDecimalPlaces(2);
  const fixed = rounded.abs().toFixed(2);
  const [whole = "0", fraction = "00"] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = rounded.isNegative() && !rounded.isZero() ? "-" : "";
  return `${sign}GH₵ ${grouped}.${fraction}`;
}

/** Adds up amounts exactly. Returns zero for an empty list. */
export function sumMoney(amounts: readonly Money[]): Money {
  return amounts.reduce<Money>((total, a) => total.plus(a), new Money(0));
}
