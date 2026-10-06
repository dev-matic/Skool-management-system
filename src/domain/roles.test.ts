import { describe, expect, it } from "vitest";
import { hasAnyRole, resolveActiveSchool } from "./roles";

describe("hasAnyRole", () => {
  it("allows a user holding one of the roles", () => {
    expect(hasAnyRole(["teacher"], ["admin", "teacher"])).toBe(true);
  });

  it("allows a user with several roles if any matches", () => {
    expect(hasAnyRole(["teacher", "admin"], ["admin"])).toBe(true);
  });

  it("denies a user without a matching role", () => {
    expect(hasAnyRole(["parent"], ["admin", "bursar"])).toBe(false);
  });

  it("denies a user with no roles", () => {
    expect(hasAnyRole([], ["admin"])).toBe(false);
  });

  it("denies when no roles are allowed", () => {
    expect(hasAnyRole(["admin"], [])).toBe(false);
  });
});

describe("resolveActiveSchool", () => {
  it("returns none when the user belongs to no school", () => {
    expect(resolveActiveSchool([], null)).toEqual({ kind: "none" });
    expect(resolveActiveSchool([], 5)).toEqual({ kind: "none" });
  });

  it("picks the only school automatically", () => {
    expect(resolveActiveSchool([7], null)).toEqual({ kind: "school", schoolId: 7 });
  });

  it("treats several roles in one school as one school", () => {
    expect(resolveActiveSchool([7, 7, 7], null)).toEqual({ kind: "school", schoolId: 7 });
  });

  it("uses the preferred school when the user is a member", () => {
    expect(resolveActiveSchool([7, 9], 9)).toEqual({ kind: "school", schoolId: 9 });
  });

  it("ignores a preferred school the user is not a member of", () => {
    expect(resolveActiveSchool([7], 9)).toEqual({ kind: "school", schoolId: 7 });
    expect(resolveActiveSchool([7, 8], 9)).toEqual({ kind: "choose" });
  });

  it("asks the user to choose between several schools", () => {
    expect(resolveActiveSchool([7, 8], null)).toEqual({ kind: "choose" });
  });
});
