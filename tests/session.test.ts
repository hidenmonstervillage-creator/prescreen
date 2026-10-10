import { describe, it, expect } from "vitest";
import { makeSessionToken, passcodeMatches, safeEqual, verifySessionToken, SESSION_MAX_AGE } from "@/lib/session";

const SECRET = "fictional-test-passcode";

describe("site session token", () => {
  it("round trips for 30 days and then expires", async () => {
    const now = Date.UTC(2026, 9, 10, 12, 0, 0);
    const t = await makeSessionToken(SECRET, now);
    expect(SESSION_MAX_AGE).toBe(30 * 24 * 60 * 60);
    expect(await verifySessionToken(SECRET, t, now)).toBe(true);
    expect(await verifySessionToken(SECRET, t, now + (SESSION_MAX_AGE - 60) * 1000)).toBe(true);
    expect(await verifySessionToken(SECRET, t, now + (SESSION_MAX_AGE + 1) * 1000)).toBe(false);
  });

  it("refuses a tampered expiry, a wrong key, garbage and nothing", async () => {
    const now = Date.now();
    const t = await makeSessionToken(SECRET, now);
    const [, exp, sig] = t.split(".");
    expect(await verifySessionToken(SECRET, `v1.${Number(exp) + 999999}.${sig}`, now)).toBe(false);
    expect(await verifySessionToken("another-passcode", t, now)).toBe(false);
    expect(await verifySessionToken(SECRET, "v1.123.abc", now)).toBe(false);
    expect(await verifySessionToken(SECRET, undefined, now)).toBe(false);
    expect(await verifySessionToken(undefined, t, now)).toBe(false);
    expect(t).not.toContain(SECRET);
  });

  it("passcode check: exact match only (outer spaces ignored), empty secret never matches", async () => {
    expect(await passcodeMatches(SECRET, SECRET)).toBe(true);
    expect(await passcodeMatches(SECRET, ` ${SECRET} `)).toBe(true);
    expect(await passcodeMatches(SECRET, SECRET.toUpperCase())).toBe(false);
    expect(await passcodeMatches(SECRET, "")).toBe(false);
    expect(await passcodeMatches("", "")).toBe(false);
  });

  it("safeEqual", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
