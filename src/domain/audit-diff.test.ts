import { describe, expect, it } from "vitest";
import { diffChanges, REDACTED } from "./audit-diff";
import { Money } from "./money";

describe("diffChanges", () => {
  it("records only fields that changed", () => {
    expect(
      diffChanges({ name: "Kofi", status: "active" }, { name: "Kofi", status: "withdrawn" }),
    ).toEqual({ status: ["active", "withdrawn"] });
  });

  it("records every field on create", () => {
    expect(diffChanges(null, { name: "Ama", classId: 3 })).toEqual({
      classId: [null, 3],
      name: [null, "Ama"],
    });
  });

  it("records every field on delete", () => {
    expect(diffChanges({ name: "Ama" }, null)).toEqual({ name: ["Ama", null] });
  });

  it("returns no changes when nothing changed", () => {
    expect(diffChanges({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual({});
  });

  it("ignores timestamps and requested fields", () => {
    expect(
      diffChanges(
        { name: "A", updatedAt: new Date(1), secretHash: "x" },
        { name: "A", updatedAt: new Date(2), secretHash: "y" },
        { ignore: ["secretHash"] },
      ),
    ).toEqual({});
  });

  it("never stores the contents of redacted fields", () => {
    const changes = diffChanges(
      { medicalNotes: "asthma" },
      { medicalNotes: "asthma, peanut allergy" },
      { redact: ["medicalNotes"] },
    );
    expect(changes).toEqual({ medicalNotes: [REDACTED, REDACTED] });
    expect(JSON.stringify(changes)).not.toContain("asthma");
  });

  it("shows when a redacted field is newly set or cleared", () => {
    expect(
      diffChanges({ medicalNotes: null }, { medicalNotes: "x" }, { redact: ["medicalNotes"] }),
    ).toEqual({
      medicalNotes: [null, REDACTED],
    });
    expect(
      diffChanges({ medicalNotes: "x" }, { medicalNotes: null }, { redact: ["medicalNotes"] }),
    ).toEqual({
      medicalNotes: [REDACTED, null],
    });
  });

  it("serialises dates, money and big integers", () => {
    expect(
      diffChanges(
        { paidOn: new Date("2026-01-05T00:00:00Z"), amount: new Money("100.50"), id: 1n },
        { paidOn: new Date("2026-01-06T00:00:00Z"), amount: new Money("120"), id: 2n },
      ),
    ).toEqual({
      amount: ["100.5", "120"],
      id: ["1", "2"],
      paidOn: ["2026-01-05T00:00:00.000Z", "2026-01-06T00:00:00.000Z"],
    });
  });

  it("treats undefined and null as the same", () => {
    expect(diffChanges({ note: undefined }, { note: null })).toEqual({});
  });

  it("detects changes inside JSON values", () => {
    expect(diffChanges({ tags: ["a"] }, { tags: ["a", "b"] })).toEqual({
      tags: [["a"], ["a", "b"]],
    });
  });
});
