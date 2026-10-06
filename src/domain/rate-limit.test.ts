import { describe, expect, it } from "vitest";
import { FailureLimiter } from "./rate-limit";

function setup(max = 3, windowMs = 60_000) {
  let time = 1_000_000;
  const limiter = new FailureLimiter(max, windowMs, () => time);
  return { limiter, advance: (ms: number) => (time += ms) };
}

describe("FailureLimiter", () => {
  it("allows attempts under the limit", () => {
    const { limiter } = setup();
    limiter.recordFailure("a");
    limiter.recordFailure("a");
    expect(limiter.isBlocked("a")).toBe(false);
    expect(limiter.retryAfterMs("a")).toBe(0);
  });

  it("blocks once the limit is reached", () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure("a");
    expect(limiter.isBlocked("a")).toBe(true);
    expect(limiter.retryAfterMs("a")).toBe(60_000);
  });

  it("keeps keys separate", () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure("a");
    expect(limiter.isBlocked("b")).toBe(false);
  });

  it("unblocks after the window passes", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure("a");
    advance(30_000);
    expect(limiter.retryAfterMs("a")).toBe(30_000);
    advance(30_001);
    expect(limiter.isBlocked("a")).toBe(false);
  });

  it("only counts failures inside the window", () => {
    const { limiter, advance } = setup();
    limiter.recordFailure("a");
    limiter.recordFailure("a");
    advance(61_000);
    limiter.recordFailure("a");
    expect(limiter.isBlocked("a")).toBe(false);
  });

  it("clears failures on reset", () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) limiter.recordFailure("a");
    limiter.reset("a");
    expect(limiter.isBlocked("a")).toBe(false);
  });
});
