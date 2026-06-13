/**
 * Patient matching policy — lives on OUR side of the PmsConnector interface so
 * behaviour is identical across PMS vendors (docs/xestro-integration.md §3).
 *
 * Deterministic match: Medicare number + DOB + surname (case/whitespace
 * normalised). Anything weaker is AMBIGUOUS and goes to the practice-side
 * reconciliation queue. We never auto-merge on a weak match.
 */

import type { CanonicalPatient } from "./canonical.js";

export interface MatchCandidate {
  externalId: string;
  familyName: string;
  birthDate: string;
  medicareNumber?: string;
}

export type MatchDecision =
  | { kind: "deterministic"; externalId: string }
  | { kind: "ambiguous"; candidateExternalIds: string[] }
  | { kind: "no_match" };

const normalise = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Medicare numbers compared digits-only (card issue suffix excluded: first 10 digits). */
const normaliseMedicare = (s: string): string => s.replace(/\D/g, "").slice(0, 10);

export function matchPatient(
  incoming: CanonicalPatient,
  candidates: MatchCandidate[],
): MatchDecision {
  const surname = normalise(incoming.familyName);
  const dob = incoming.birthDate;
  const medicare = incoming.medicareNumber
    ? normaliseMedicare(incoming.medicareNumber)
    : null;

  if (medicare) {
    const deterministic = candidates.filter(
      (c) =>
        c.medicareNumber &&
        normaliseMedicare(c.medicareNumber) === medicare &&
        c.birthDate === dob &&
        normalise(c.familyName) === surname,
    );
    if (deterministic.length === 1) {
      return { kind: "deterministic", externalId: deterministic[0]!.externalId };
    }
    if (deterministic.length > 1) {
      // Same Medicare card across multiple PMS records — needs human eyes.
      return {
        kind: "ambiguous",
        candidateExternalIds: deterministic.map((c) => c.externalId),
      };
    }
  }

  // Weak signals only (surname + DOB without Medicare): never auto-match.
  const weak = candidates.filter(
    (c) => c.birthDate === dob && normalise(c.familyName) === surname,
  );
  if (weak.length > 0) {
    return { kind: "ambiguous", candidateExternalIds: weak.map((c) => c.externalId) };
  }

  return { kind: "no_match" };
}
