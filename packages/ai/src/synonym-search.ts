/**
 * Search synonym mapping (brief §5.1): "skin check" → Dermatology,
 * "knee replacement" → Orthopaedic Surgery.
 *
 * Two tiers:
 *  1. Curated static map — instant, free, covers the head of the distribution.
 *  2. Claude structured-output fallback for the long tail. Callers cache the
 *     result (Postgres `search_synonym` table) so each novel term costs one
 *     call ever.
 *
 * Privacy: inputs are search terms not linked to patient identity. The result
 * influences ranking by RELEVANCE only — never paid placement (§10.1).
 */

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL } from "./client.js";

export const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Surgery",
  "Geriatric Medicine",
  "Gynaecology",
  "Haematology",
  "Immunology & Allergy",
  "Infectious Diseases",
  "Nephrology",
  "Neurology",
  "Neurosurgery",
  "Obstetrics",
  "Oncology",
  "Ophthalmology",
  "Oral & Maxillofacial Surgery",
  "Orthopaedic Surgery",
  "Otolaryngology (ENT)",
  "Paediatrics",
  "Pain Medicine",
  "Plastic & Reconstructive Surgery",
  "Psychiatry",
  "Rehabilitation Medicine",
  "Respiratory & Sleep Medicine",
  "Rheumatology",
  "Urology",
  "Vascular Surgery",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** Head-of-distribution synonyms — extend from real search logs post-launch. */
const STATIC_MAP: Record<string, Specialty[]> = {
  "skin check": ["Dermatology"],
  "skin cancer": ["Dermatology"],
  mole: ["Dermatology"],
  eczema: ["Dermatology"],
  acne: ["Dermatology"],
  "knee replacement": ["Orthopaedic Surgery"],
  "hip replacement": ["Orthopaedic Surgery"],
  "joint pain": ["Orthopaedic Surgery", "Rheumatology"],
  arthritis: ["Rheumatology", "Orthopaedic Surgery"],
  "back pain": ["Orthopaedic Surgery", "Neurosurgery", "Pain Medicine"],
  colonoscopy: ["Gastroenterology"],
  endoscopy: ["Gastroenterology"],
  reflux: ["Gastroenterology"],
  heartburn: ["Gastroenterology"],
  "heart check": ["Cardiology"],
  palpitations: ["Cardiology"],
  "chest pain": ["Cardiology"],
  "blood pressure": ["Cardiology", "Nephrology"],
  diabetes: ["Endocrinology"],
  thyroid: ["Endocrinology"],
  "sleep apnoea": ["Respiratory & Sleep Medicine"],
  "sleep apnea": ["Respiratory & Sleep Medicine"],
  snoring: ["Respiratory & Sleep Medicine", "Otolaryngology (ENT)"],
  asthma: ["Respiratory & Sleep Medicine"],
  cataract: ["Ophthalmology"],
  "eye check": ["Ophthalmology"],
  glaucoma: ["Ophthalmology"],
  "hearing loss": ["Otolaryngology (ENT)"],
  tonsils: ["Otolaryngology (ENT)"],
  sinus: ["Otolaryngology (ENT)"],
  "prostate check": ["Urology"],
  kidney: ["Nephrology", "Urology"],
  "kidney stones": ["Urology"],
  vasectomy: ["Urology"],
  migraine: ["Neurology"],
  headache: ["Neurology"],
  epilepsy: ["Neurology"],
  anxiety: ["Psychiatry"],
  depression: ["Psychiatry"],
  adhd: ["Psychiatry", "Paediatrics"],
  "varicose veins": ["Vascular Surgery"],
  hernia: ["General Surgery"],
  gallbladder: ["General Surgery", "Gastroenterology"],
  endometriosis: ["Gynaecology"],
  fertility: ["Gynaecology", "Obstetrics"],
  pregnancy: ["Obstetrics"],
  menopause: ["Gynaecology", "Endocrinology"],
  allergy: ["Immunology & Allergy"],
  "hay fever": ["Immunology & Allergy", "Otolaryngology (ENT)"],
};

export interface SynonymResult {
  specialties: Specialty[];
  source: "static" | "model";
  /** Model-resolved results below this are treated as "no mapping" by search. */
  confident: boolean;
}

export function lookupStaticSynonym(term: string): SynonymResult | null {
  const key = term.trim().toLowerCase();
  const hit = STATIC_MAP[key];
  if (!hit) return null;
  return { specialties: hit, source: "static", confident: true };
}

const MappingSchema = z.object({
  recognised: z
    .boolean()
    .describe("False if the term is not a medical condition, procedure, or symptom."),
  specialties: z
    .array(z.enum(SPECIALTIES))
    .describe(
      "Specialties a patient with this condition/procedure would be referred to, most relevant first. At most 3. Empty if not recognised.",
    ),
  confident: z
    .boolean()
    .describe("True only if the mapping is clinically standard and unambiguous."),
});

export async function resolveSynonym(
  client: Anthropic,
  term: string,
): Promise<SynonymResult> {
  const staticHit = lookupStaticSynonym(term);
  if (staticHit) return staticHit;

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "You map Australian patient search terms (conditions, procedures, symptoms, lay phrasing) to the medical specialties a GP would refer them to. Administrative mapping only — you are not giving health advice.",
    messages: [{ role: "user", content: `Search term: "${term.trim()}"` }],
    output_config: { format: zodOutputFormat(MappingSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || !parsed.recognised || parsed.specialties.length === 0) {
    return { specialties: [], source: "model", confident: false };
  }
  return {
    specialties: parsed.specialties.slice(0, 3),
    source: "model",
    confident: parsed.confident,
  };
}
