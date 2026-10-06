import { describe, expect, it } from "vitest";
import { formatGHS, Money, MoneyFormatError, parseMoney, sumMoney, toMoneyString } from "./money";

describe("parseMoney", () => {
  it.each([
    ["1500", "1500.00"],
    ["1,500.50", "1500.50"],
    ["  250.5 ", "250.50"],
    ["GH₵ 1,200", "1200.00"],
    ["GHS1200.75", "1200.75"],
    ["ghc 10", "10.00"],
    ["0", "0.00"],
    ["-20", "-20.00"],
  ])("parses %j as %s", (input, expected) => {
    expect(toMoneyString(parseMoney(input))).toBe(expected);
  });

  it.each(["", "abc", "12.345", "1.2.3", "GH₵", "1e5", "10,00.5x", "--5"])(
    "rejects %j",
    (input) => {
      expect(() => parseMoney(input)).toThrow(MoneyFormatError);
    },
  );
});

describe("exact arithmetic", () => {
  it("does not suffer floating point errors", () => {
    expect(toMoneyString(parseMoney("0.1").plus(parseMoney("0.2")))).toBe("0.30");
    expect(sumMoney([parseMoney("0.10"), parseMoney("0.20")]).equals(parseMoney("0.30"))).toBe(
      true,
    );
  });

  it("sums many school-fee payments exactly", () => {
    const payments = Array.from({ length: 1000 }, () => parseMoney("0.01"));
    expect(toMoneyString(sumMoney(payments))).toBe("10.00");
  });

  it("sums an empty list to zero", () => {
    expect(toMoneyString(sumMoney([]))).toBe("0.00");
  });

  it("rounds half up to 2 decimal places", () => {
    expect(toMoneyString(new Money("2.005"))).toBe("2.01");
    expect(toMoneyString(new Money("2.004"))).toBe("2.00");
    expect(toMoneyString(new Money("100").dividedBy(3))).toBe("33.33");
  });
});

describe("formatGHS", () => {
  it.each([
    ["0", "GH₵ 0.00"],
    ["5", "GH₵ 5.00"],
    ["1234.5", "GH₵ 1,234.50"],
    ["1234567.89", "GH₵ 1,234,567.89"],
    ["-20", "-GH₵ 20.00"],
    ["-0.001", "GH₵ 0.00"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatGHS(new Money(input))).toBe(expected);
  });
});
