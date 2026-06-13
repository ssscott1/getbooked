/**
 * Anthropic client factory.
 *
 * DATA-RESIDENCY GATE (brief §10.1 — non-negotiable): referral documents are
 * identifiable health information. They may only be sent to an AI endpoint
 * under an approved Australian-region / compliant configuration, or after
 * de-identification. `ANTHROPIC_BASE_URL` pins traffic to the approved
 * endpoint; deployment config refuses to enable referral extraction in
 * production until that gate is signed off (see docs/proposal.md §3).
 *
 * Credentials come from the environment / secrets manager — never hardcoded.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AiClientOptions {
  /** Override for tests or to pin to a compliant endpoint. Defaults to ANTHROPIC_BASE_URL. */
  baseURL?: string;
}

export function createAiClient(options: AiClientOptions = {}): Anthropic {
  const baseURL = options.baseURL ?? (process.env["ANTHROPIC_BASE_URL"] || undefined);
  // API key resolves from ANTHROPIC_API_KEY via the SDK's default chain.
  return new Anthropic(baseURL ? { baseURL } : {});
}

/**
 * Default model for both AI features. Opus-tier for extraction quality on
 * poor phone photos; synonym results are cached so the long-tail call volume
 * is low.
 */
export const AI_MODEL = "claude-opus-4-8";
