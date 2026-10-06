import { describe, expect, it } from "vitest";
import { Money, sumMoney } from "@/domain/money";
import {
  ARREARS_AGEING,
  CLASSES,
  LARGEST_ARREARS,
  PAYMENTS_BY_METHOD,
  ageBucket,
  attendanceSummary,
  feeSummary,
} from "./data";

describe("dashboard preview figures", () => {
  it("payments by method add up to the fees collected", () => {
    const byMethod = sumMoney(PAYMENTS_BY_METHOD.map((p) => new Money(p.amount)));
    expect(byMethod.equals(feeSummary(CLASSES).collected)).toBe(true);
  });

  it("works out the collection rate exactly", () => {
    const s = feeSummary(CLASSES);
    expect(s.expected.toFixed(2)).toBe("356900.00");
    expect(s.collected.toFixed(2)).toBe("257370.00");
    expect(s.outstanding.toFixed(2)).toBe("99530.00");
    expect(s.rate).toBe(72.1);
  });

  it("counts attendance only for marked registers", () => {
    const a = attendanceSummary(CLASSES);
    expect(a.notMarked).toBe(2);
    expect(a.present + a.absent).toBe(333);
    expect(a.present).toBe(312);
    expect(a.rate).toBe(93.7);
    expect(attendanceSummary([]).rate).toBeNull();
  });

  it("puts each overdue balance in the right age band", () => {
    expect([0, 30, 31, 60, 61].map(ageBucket)).toEqual(["0-30", "0-30", "31-60", "31-60", "60+"]);
    for (const row of LARGEST_ARREARS) expect(new Money(row.balance).isPositive()).toBe(true);
    expect(ARREARS_AGEING.map((b) => b.bucket)).toEqual(["0-30", "31-60", "60+"]);
  });
});
