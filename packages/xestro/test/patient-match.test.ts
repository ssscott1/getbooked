import { describe, expect, it } from "vitest";
import { matchPatient, type MatchCandidate } from "../src/patient-match.js";

const candidates: MatchCandidate[] = [
  {
    externalId: "x1",
    familyName: "Nguyen",
    birthDate: "1958-03-14",
    medicareNumber: "2123 45670 1",
  },
  { externalId: "x2", familyName: "Nguyen", birthDate: "1958-03-14" },
  { externalId: "x3", familyName: "Smith", birthDate: "1990-01-01" },
];

describe("matchPatient", () => {
  it("deterministic match on Medicare + DOB + surname", () => {
    const decision = matchPatient(
      {
        familyName: "NGUYEN",
        givenName: "Thi",
        birthDate: "1958-03-14",
        medicareNumber: "2123456701", // formatting differences tolerated
      },
      candidates,
    );
    expect(decision).toEqual({ kind: "deterministic", externalId: "x1" });
  });

  it("never auto-matches on surname + DOB alone — goes to reconciliation", () => {
    const decision = matchPatient(
      { familyName: "Nguyen", givenName: "Thi", birthDate: "1958-03-14" },
      candidates,
    );
    expect(decision.kind).toBe("ambiguous");
    if (decision.kind === "ambiguous") {
      expect(decision.candidateExternalIds).toEqual(["x1", "x2"]);
    }
  });

  it("Medicare mismatch with weak demographic overlap is ambiguous, not a match", () => {
    const decision = matchPatient(
      {
        familyName: "Nguyen",
        givenName: "Thi",
        birthDate: "1958-03-14",
        medicareNumber: "9999999999",
      },
      candidates,
    );
    expect(decision.kind).toBe("ambiguous");
  });

  it("no match for an unknown patient", () => {
    const decision = matchPatient(
      { familyName: "Khan", givenName: "A", birthDate: "2001-07-07" },
      candidates,
    );
    expect(decision).toEqual({ kind: "no_match" });
  });
});
