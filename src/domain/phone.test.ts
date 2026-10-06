import { describe, expect, it } from "vitest";
import { formatPhone, normalisePhone } from "./phone";

describe("normalisePhone", () => {
  it.each([
    ["0241234567", "+233241234567"], // MTN
    ["024 123 4567", "+233241234567"],
    ["024-123-4567", "+233241234567"],
    ["(024) 123 4567", "+233241234567"],
    ["+233241234567", "+233241234567"],
    ["+233 24 123 4567", "+233241234567"],
    ["233241234567", "+233241234567"],
    ["00233241234567", "+233241234567"],
    ["  0551234567  ", "+233551234567"], // MTN
    ["0201234567", "+233201234567"], // Telecel
    ["0261234567", "+233261234567"], // AirtelTigo
    ["0571234567", "+233571234567"], // AirtelTigo
    ["0302123456", "+233302123456"], // Accra landline
    ["+447911123456", "+447911123456"], // parent abroad
  ])("normalises %j to %s", (input, expected) => {
    expect(normalisePhone(input)).toEqual({ ok: true, e164: expected });
  });

  it.each([
    ["", "Enter a phone number."],
    ["   ", "Enter a phone number."],
    ["024123456", "not a valid"], // one digit short
    ["02412345678", "not a valid"], // one digit too many
    ["12345", "not a valid"],
    ["024 123 4567 ext", "only contain"],
    ["call 0241234567", "only contain"],
    ["kofi@example.com", "only contain"],
  ])("rejects %j", (input, message) => {
    const result = normalisePhone(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe("formatPhone", () => {
  it("formats Ghanaian numbers in the familiar national style", () => {
    expect(formatPhone("+233241234567")).toBe("024 123 4567");
  });

  it("formats foreign numbers internationally", () => {
    expect(formatPhone("+447911123456")).toBe("+44 7911 123456");
  });

  it("returns unparseable input unchanged", () => {
    expect(formatPhone("not a phone")).toBe("not a phone");
  });
});
