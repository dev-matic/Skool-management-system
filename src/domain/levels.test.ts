import { describe, expect, it } from "vitest";
import { checkName, isStage, moveItem, STANDARD_LEVELS } from "./levels";

describe("STANDARD_LEVELS", () => {
  it("are KG 1-2, Basic 1-6 and JHS 1-3 in order", () => {
    expect(STANDARD_LEVELS.map((l) => l.name)).toEqual([
      "KG 1",
      "KG 2",
      "Basic 1",
      "Basic 2",
      "Basic 3",
      "Basic 4",
      "Basic 5",
      "Basic 6",
      "JHS 1",
      "JHS 2",
      "JHS 3",
    ]);
  });
});

describe("checkName", () => {
  it("tidies spaces", () => {
    expect(checkName("  JHS   2A ", "class")).toEqual({ name: "JHS 2A" });
  });

  it("explains an empty or long name", () => {
    expect(checkName(" ", "class").error).toBe("Enter the class name, e.g. JHS 2A.");
    expect(checkName("x".repeat(41), "level").error).toBe("Use at most 40 characters.");
  });
});

describe("isStage", () => {
  it("accepts the four stages only", () => {
    expect(isStage("jhs")).toBe(true);
    expect(isStage("college")).toBe(false);
  });
});

describe("moveItem", () => {
  it("swaps with the neighbour and ignores moves past the ends", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });
});
