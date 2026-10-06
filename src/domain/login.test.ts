import { describe, expect, it } from "vitest";
import { isPlaceholderEmail, parseLoginIdentifier, placeholderEmailForPhone } from "./login";

describe("parseLoginIdentifier", () => {
  it("recognises email addresses and lower-cases them", () => {
    expect(parseLoginIdentifier("  Ama.Mensah@Example.com ")).toEqual({
      kind: "email",
      email: "ama.mensah@example.com",
    });
  });

  it("recognises Ghanaian phone numbers in any common format", () => {
    for (const input of ["0241234567", "024 123 4567", "+233241234567", "233241234567"]) {
      expect(parseLoginIdentifier(input)).toEqual({ kind: "phone", e164: "+233241234567" });
    }
  });

  it.each(["", "ama@", "@example.com", "ama@example", "0241", "hello"])("rejects %j", (input) => {
    expect(parseLoginIdentifier(input)).toEqual({ kind: "invalid" });
  });
});

describe("placeholder emails for phone-only users", () => {
  it("builds a reserved, undeliverable address from the phone number", () => {
    expect(placeholderEmailForPhone("+233241234567")).toBe("233241234567@phone.invalid");
  });

  it("detects placeholder addresses", () => {
    expect(isPlaceholderEmail("233241234567@phone.invalid")).toBe(true);
    expect(isPlaceholderEmail("ama@example.com")).toBe(false);
  });
});
