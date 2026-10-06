import { describe, expect, it } from "vitest";
import { checkPassword, parseNewStaff, parseRoles, wouldLeaveNoAdmin } from "./staff";

// FAKE details for tests only.
const VALID = {
  name: "  Abena   Mensah ",
  phone: "024 400 0001",
  email: "",
  roles: ["teacher"],
  password: "first-pass-1",
};

describe("parseNewStaff", () => {
  it("cleans up a valid entry", () => {
    expect(parseNewStaff(VALID)).toEqual({
      ok: true,
      value: {
        name: "Abena Mensah",
        phone: "+233244000001",
        email: null,
        roles: ["teacher"],
        password: "first-pass-1",
      },
    });
  });

  it("lower-cases an email address", () => {
    const parsed = parseNewStaff({ ...VALID, email: "A.Mensah@Example.test" });
    expect(parsed.ok && parsed.value.email).toBe("a.mensah@example.test");
  });

  it("reports every problem at once, by field", () => {
    const parsed = parseNewStaff({
      name: "A",
      phone: "12",
      email: "nope",
      roles: [],
      password: "short",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(Object.keys(parsed.errors).sort()).toEqual([
        "email",
        "name",
        "password",
        "phone",
        "roles",
      ]);
      expect(parsed.errors.password).toBe("Use at least 8 characters.");
    }
  });

  it("never accepts parent or student roles in Phase 1", () => {
    const parsed = parseNewStaff({ ...VALID, roles: ["parent", "student"] });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.roles).toBe("Choose at least one role.");
  });
});

describe("parseRoles", () => {
  it("keeps Phase 1 roles once each and drops anything else", () => {
    expect(parseRoles(["teacher", "admin", "teacher", "parent", "owner"])).toEqual([
      "teacher",
      "admin",
    ]);
  });
});

describe("checkPassword", () => {
  it("needs 8 to 128 characters", () => {
    expect(checkPassword("1234567")).not.toBeNull();
    expect(checkPassword("12345678")).toBeNull();
    expect(checkPassword("x".repeat(129))).not.toBeNull();
  });
});

describe("wouldLeaveNoAdmin", () => {
  it("is true only when the last admin loses admin rights", () => {
    expect(wouldLeaveNoAdmin(["a"], "a")).toBe(true);
    expect(wouldLeaveNoAdmin(["a", "b"], "a")).toBe(false);
    expect(wouldLeaveNoAdmin(["a"], "b")).toBe(false);
  });
});
