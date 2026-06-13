import { describe, expect, it } from "vitest";
import { lookupStaticSynonym } from "../src/synonym-search.js";
import { fieldsNeedingReview, type ReferralExtraction } from "../src/referral-extraction.js";

describe("lookupStaticSynonym", () => {
  it("maps the brief's examples without an API call", () => {
    expect(lookupStaticSynonym("skin check")?.specialties).toEqual(["Dermatology"]);
    expect(lookupStaticSynonym("knee replacement")?.specialties).toEqual([
      "Orthopaedic Surgery",
    ]);
  });

  it("is case/whitespace insensitive", () => {
    expect(lookupStaticSynonym("  Skin Check ")?.specialties).toEqual(["Dermatology"]);
  });

  it("returns null for unknown terms (caller falls through to the model)", () => {
    expect(lookupStaticSynonym("achalasia")).toBeNull();
  });
});

describe("fieldsNeedingReview", () => {
  const base: ReferralExtraction = {
    isReferralLetter: true,
    legibility: "good",
    referringDoctor: {
      name: "Dr J Citizen",
      providerNumber: "2426621B",
      practiceName: "Example Family Practice",
      confidence: "high",
    },
    patient: { fullName: "Thi Nguyen", dateOfBirth: "1958-03-14", confidence: "high" },
    referralDate: { date: "2026-05-01", confidence: "high" },
    referralPeriod: { period: "12_months", confidence: "high" },
    addressee: { name: "Dr A Specialist", specialty: "Dermatology", confidence: "high" },
    reasonSummary: "Review of a changing pigmented lesion.",
  };

  it("flags nothing on a clean extraction", () => {
    expect(fieldsNeedingReview(base)).toEqual([]);
  });

  it("flags low-confidence and null fields for human review", () => {
    const degraded: ReferralExtraction = {
      ...base,
      legibility: "poor",
      referralDate: { date: null, confidence: "low" },
      referringDoctor: { ...base.referringDoctor, providerNumber: null, confidence: "low" },
    };
    const flagged = fieldsNeedingReview(degraded);
    expect(flagged).toContain("referralDate");
    expect(flagged).toContain("providerNumber");
    expect(flagged).toContain("document");
  });
});
