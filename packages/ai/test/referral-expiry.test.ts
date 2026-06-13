import { describe, expect, it } from "vitest";
import {
  checkReferralAgainstAppointment,
  computeReferralExpiry,
} from "../src/referral-expiry.js";

const d = (iso: string) => new Date(iso);

describe("computeReferralExpiry", () => {
  it("12-month referral expires 12 months from writing", () => {
    const v = computeReferralExpiry(d("2026-01-15T00:00:00Z"), "12_months");
    expect(v.expiresAt?.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(v.defaultApplied).toBe(false);
  });

  it("not_stated defaults to 12 months for GP referrers (MBS rule)", () => {
    const v = computeReferralExpiry(d("2026-01-15T00:00:00Z"), "not_stated");
    expect(v.periodMonthsApplied).toBe(12);
    expect(v.defaultApplied).toBe(true);
  });

  it("not_stated defaults to 3 months for specialist referrers", () => {
    const v = computeReferralExpiry(d("2026-01-15T00:00:00Z"), "not_stated", {
      referrerKind: "specialist",
    });
    expect(v.periodMonthsApplied).toBe(3);
  });

  it("indefinite referrals never expire", () => {
    const v = computeReferralExpiry(d("2020-06-01T00:00:00Z"), "indefinite");
    expect(v.expiresAt).toBeNull();
  });

  it("clamps end-of-month arithmetic (31 Jan + 3 months → 30 Apr)", () => {
    const v = computeReferralExpiry(d("2026-01-31T00:00:00Z"), "3_months");
    expect(v.expiresAt?.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });
});

describe("checkReferralAgainstAppointment (§14 alert predicate)", () => {
  const validity = computeReferralExpiry(d("2026-01-01T00:00:00Z"), "3_months");
  // expires 2026-04-01

  it("valid when appointment falls inside the referral period", () => {
    const check = checkReferralAgainstAppointment(
      validity,
      d("2026-03-01T09:00:00Z"),
      d("2026-02-01T00:00:00Z"),
    );
    expect(check.status).toBe("valid");
  });

  it("flags a referral that lapses before the booked appointment", () => {
    const check = checkReferralAgainstAppointment(
      validity,
      d("2026-05-01T09:00:00Z"),
      d("2026-02-01T00:00:00Z"),
    );
    expect(check.status).toBe("expiring_before_appointment");
  });

  it("flags an already-expired referral", () => {
    const check = checkReferralAgainstAppointment(
      validity,
      d("2026-06-01T09:00:00Z"),
      d("2026-05-01T00:00:00Z"),
    );
    expect(check.status).toBe("expired");
  });

  it("indefinite referrals are always valid", () => {
    const indefinite = computeReferralExpiry(d("2019-01-01T00:00:00Z"), "indefinite");
    const check = checkReferralAgainstAppointment(indefinite, d("2030-01-01T00:00:00Z"));
    expect(check.status).toBe("valid");
  });
});
