/**
 * Referral document extraction (brief §5.2).
 *
 * One structured-output call against a strict Zod schema: the model reads a
 * phone photo or PDF of a GP referral letter and returns referrer details,
 * dates, referral period, and patient identifiers, each with a confidence
 * signal.
 *
 * Product rules enforced here and downstream:
 *  - Extraction PRE-FILLS; it never auto-actions. The patient confirms at
 *    upload, the practice confirms at triage (verifiedAt in the data model).
 *  - Expiry is computed by deterministic code (referral-expiry.ts), never
 *    taken from the model.
 *  - Identifiable documents only flow through the approved endpoint — see
 *    the data-residency gate in client.ts.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL } from "./client.js";

// ── Schema ──────────────────────────────────────────────────────────────────

const fieldConfidence = z
  .enum(["high", "medium", "low"])
  .describe(
    "high: clearly printed and unambiguous. medium: readable but partially inferred. low: guessed from degraded text — must be highlighted for human review.",
  );

export const ReferralExtractionSchema = z.object({
  isReferralLetter: z
    .boolean()
    .describe("False if the document is clearly not a medical referral letter."),
  legibility: z
    .enum(["good", "partial", "poor"])
    .describe("Overall readability of the source document."),
  referringDoctor: z.object({
    name: z.string().nullable(),
    providerNumber: z
      .string()
      .nullable()
      .describe(
        "Australian Medicare provider number of the REFERRING doctor (not the addressee). 6 digits + practice location character + check character, e.g. 2426621B. Null if not legible.",
      ),
    practiceName: z.string().nullable(),
    confidence: fieldConfidence,
  }),
  patient: z.object({
    fullName: z.string().nullable(),
    dateOfBirth: z
      .string()
      .nullable()
      .describe("ISO 8601 date (YYYY-MM-DD). Null if not present or not legible."),
    confidence: fieldConfidence,
  }),
  referralDate: z.object({
    date: z
      .string()
      .nullable()
      .describe(
        "ISO 8601 date the referral was WRITTEN. Distinguish from appointment dates or letterhead print dates mentioned in the document.",
      ),
    confidence: fieldConfidence,
  }),
  referralPeriod: z.object({
    period: z
      .enum(["3_months", "12_months", "indefinite", "not_stated"])
      .describe(
        "Stated validity period. GP referrals to specialists default to 12 months when not stated, but report what the DOCUMENT says — the default is applied by code, not by you.",
      ),
    confidence: fieldConfidence,
  }),
  addressee: z.object({
    name: z
      .string()
      .nullable()
      .describe("The specialist or clinic the referral is addressed to, if named."),
    specialty: z
      .string()
      .nullable()
      .describe("Medical specialty referred to, normalised (e.g. 'Dermatology')."),
    confidence: fieldConfidence,
  }),
  reasonSummary: z
    .string()
    .nullable()
    .describe(
      "One-sentence, non-diagnostic summary of the stated reason for referral, for the practice triage queue only.",
    ),
});

export type ReferralExtraction = z.infer<typeof ReferralExtractionSchema>;

// ── Input ───────────────────────────────────────────────────────────────────

export type ReferralDocumentInput =
  | { kind: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string }
  | { kind: "pdf"; base64: string };

const SYSTEM_PROMPT = `You extract structured metadata from Australian GP referral letters for a specialist booking platform.

Read the document carefully, including handwritten portions, stamps, and letterheads. Photographs may be skewed, shadowed, or partially cropped.

Rules:
- Report only what the document supports. Use null and a "low" confidence rather than guessing.
- The referring doctor is the author of the letter, not the specialist it is addressed to. Provider numbers near the signature or letterhead belong to the referrer; ones in the address block belong to the addressee.
- Never interpret clinical content beyond the one-sentence reason summary. You are doing administrative extraction, not triage or diagnosis.`;

// ── Call ────────────────────────────────────────────────────────────────────

export async function extractReferral(
  client: Anthropic,
  document: ReferralDocumentInput,
): Promise<{ extraction: ReferralExtraction; model: string }> {
  const contentBlock =
    document.kind === "pdf"
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: document.base64,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: document.mediaType,
            data: document.base64,
          },
        } as const);

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Extract the referral metadata from this document.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ReferralExtractionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Referral extraction returned no parseable output");
  }
  return { extraction: response.parsed_output, model: response.model };
}

/**
 * Fields that must be visually highlighted for human review in the upload
 * confirm screen and the practice triage queue.
 */
export function fieldsNeedingReview(extraction: ReferralExtraction): string[] {
  const flagged: string[] = [];
  const check = (name: string, confidence: "high" | "medium" | "low", value: unknown) => {
    if (confidence === "low" || value === null) flagged.push(name);
  };
  check("referringDoctor", extraction.referringDoctor.confidence, extraction.referringDoctor.name);
  check(
    "providerNumber",
    extraction.referringDoctor.confidence,
    extraction.referringDoctor.providerNumber,
  );
  check("patient", extraction.patient.confidence, extraction.patient.fullName);
  check("referralDate", extraction.referralDate.confidence, extraction.referralDate.date);
  if (extraction.referralPeriod.confidence === "low") flagged.push("referralPeriod");
  if (extraction.legibility === "poor") flagged.push("document");
  return flagged;
}
