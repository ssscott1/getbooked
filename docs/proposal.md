# Developer Proposal — Project Specialist-First ("GetBooked")

Response to brief v1.0 (Sierra Bravo Capital, June 2026). This document answers the five
open questions in §15 of the brief and states the build approach. Companion documents:

- [`architecture.md`](./architecture.md) — system design, stack, sync architecture
- [`data-model.md`](./data-model.md) — ERD and entity lifecycle notes
- [`xestro-integration.md`](./xestro-integration.md) — target API contract, mocks, fallback modes

---

## 1. Xestro mocked-contract strategy and swap timeline

**Approach.** We code the entire product against an internal `PmsConnector` interface
(`packages/xestro/src/connector.ts`) whose shape *is* the target contract we will put in
front of Xestro — OAuth 2.0 client-credentials per practice, windowed availability reads,
idempotent appointment writes, patient match-or-create, document attach, and signed
webhooks. The canonical data model behind the interface is FHIR R4-shaped (Patient,
Practitioner, Schedule, Slot, Appointment, DocumentReference), so Genie / Clinic to Cloud /
Zedmed connectors in Phase 3 are additional implementations of the same interface, not
rewrites.

Three implementations exist from week 1:

| Implementation | Purpose |
|---|---|
| `MockXestroConnector` | In-memory, deterministic, webhook-simulating. Drives all dev/test/E2E. |
| `ManagedCalendarConnector` | Fallback mode A — our platform masters online slots; daily reconciliation worklist. |
| `RequestModeConnector` | Fallback mode B — indicative availability + one-click practice confirm. Permanent per-appointment-type setting, not just a fallback. |

**Swap speed once the partnership lands.** Because every product feature consumes the
interface and never Xestro specifics, the swap is: implement `XestroLiveConnector`
(~3–4 weeks: auth + read paths first, then writes, then webhooks), run it in
**shadow mode** against the mock for 1–2 weeks per pilot practice (read-only diffing of
availability responses), then flip a per-practice feature flag. No product code changes.
The riskiest piece is patient matching — that's why the contract specifies a
deterministic-first match (Medicare number + DOB + surname) with a practice-side
reconciliation queue for anything weaker, and why that logic lives on **our** side of the
interface so it works identically across PMS vendors.

**Negotiation posture.** We bring Xestro a finished contract document with mock server +
conformance tests they can run against their implementation. That converts a vague
"can we have an API" conversation into a scoped engineering task for their team, and the
conformance suite becomes the regression gate for both sides.

## 2. Slot-hold and double-booking prevention under fallback modes

**Live-sync mode.** Redis slot-hold with ~5-minute TTL taken at checkout start
(`SET key NX PX`), single-claim semantics; Xestro wins all availability conflicts —
if the write-back fails because the slot was taken at the front desk, the hold is
released, the patient sees a "that time was just taken" recovery flow with the next
three alternatives pre-loaded.

**Managed-calendar mode.** No conflict problem online — we are the source of truth for
the online allocation, so a plain DB uniqueness constraint (`slot_id` on confirmed
appointments) plus the same Redis hold for checkout concurrency is sufficient. The risk
moves to *offline* double-booking (front desk books the same time directly in Xestro).
Mitigations: (a) practices allocate distinct online-only session blocks during onboarding
— this is how clinics already ration online slots and we make it the default; (b) the
daily reconciliation worklist surfaces collisions within one business day; (c) the 24–48h
confirm SMS acts as a final catch.

**Request mode.** Double-booking is structurally impossible — nothing is confirmed until
the practice confirms in Xestro itself. We hold the *request* (not the slot) and apply an
expiry (practice-configurable, default 2 business days) with automatic patient
notification if unactioned. The waitlist-backfill claim-window feature uses the identical
hold primitive: a 15-minute exclusive claim per waitlisted patient, sequential offers, no
overlap (implemented and unit-tested in `packages/xestro/src/slot-hold.ts`).

## 3. Referral document extraction — build vs API, expected accuracy

**Recommendation: vision-capable LLM extraction (Claude API) rather than traditional OCR
pipeline (Textract/Tesseract + rules).** GP referral letters are unstructured, highly
variable, and frequently photographed badly. Classic OCR gives you characters; the hard
part is *interpretation* — which of the three dates is the referral date, whether
"indefinite" is implied, which provider number belongs to the referrer vs the addressee.
A multimodal model does transcription and interpretation in one structured-output call,
and `claude-opus-4-8` handles phone photos of letters (skew, shadow, handwriting
fragments) far better than rules over OCR text.

Implementation (already scaffolded in `packages/ai`):

- One `messages.parse()` call with a strict Zod schema → guaranteed-parseable JSON
  (referrer name/provider number, referral date, period 3/12/indefinite, patient name/DOB,
  specialty, addressee), with a per-field `confidence` and an overall `legibility` signal.
- **Every extraction is human-confirmed** — by the patient at upload ("we read this as…
  correct?") and by the practice at triage. The model pre-fills; people confirm. This is
  both the accuracy backstop and the §10.3 regulatory position (no auto-actioning).
- Expiry computation is **deterministic code**, not model output: the model extracts date
  + period; `computeReferralExpiry()` (pure, unit-tested) derives the lapse date and the
  appointment-conflict alert.

**Expected accuracy** (to be validated in week 1–2 on a corpus of ~200 real de-identified
referrals — this is a named milestone, not an assumption): on clean PDFs/e-referrals,
high-90s field-level accuracy is realistic; on phone photos, expect high-80s to low-90s
on the critical fields (provider number and dates are the failure modes — digits and
handwriting). The product is designed so that even 85% is a major win: extraction
pre-fills and flags, humans confirm, and any field below the confidence threshold is
visually highlighted for review. We will publish the measured accuracy to ourselves as a
tracked metric and gate the "auto-flag expiring referrals" feature on it.

**Privacy gate (hard requirement before production use on identifiable documents):**
referral letters are identifiable health information. §10.1 requires Australian-region
processing or de-identified inputs for AI sub-processors. The AI module therefore (a)
takes a configurable endpoint (`ANTHROPIC_BASE_URL`) so traffic can be pinned to a
compliant/approved configuration, and (b) ships with a redaction pre-pass option. The
go/no-go on sending identifiable documents is a legal/DPA decision made before Phase 2
launch; until then the feature runs in pilot on de-identified test corpora only.

## 4. Team, milestones, and what we cut at −25%

**Team (MVP, 16–20 weeks):**

| Role | FTE | Notes |
|---|---|---|
| Tech lead / backend (TypeScript) | 1.0 | Owns integration layer + booking path |
| Full-stack engineer | 2.0 | Marketplace + practice portal |
| Product designer | 0.6 | Mobile-first booking flow, WCAG 2.2 AA |
| QA / test automation | 0.5 | E2E on booking path; ramps to 1.0 pre-launch |
| Security/compliance consultant | 0.2 | APP/ISO 27001 alignment, pen-test scoping |
| PM (client side acceptable) | 0.4 | |

**Milestone-based pricing structure** (amounts at kickoff): M1 foundations + data model +
mocked integration layer (weeks 1–4) · M2 marketplace directory + profiles + SEO (5–8) ·
M3 booking flow + referral upload + fee display + request mode (9–12) · M4 practice
portal + triage queue + SMS journeys (13–16) · M5 billing + hardening + pen test +
launch (17–20). Each milestone has demoable acceptance criteria from §14 of the brief;
payment on acceptance.

**If the timeline compresses 25% (≈15 weeks), we cut, in order:**

1. **Patient deposits / card vaulting** (Stripe SaaS billing stays — we must be able to
   charge practices; patient-side payments are additive).
2. **Embeddable widget** → Phase 2 (directory + profile pages carry acquisition for launch).
3. **Analytics dashboard** → ship raw CSV export + a thin "today" view only.
4. **Intake forms** → use referral upload + SMS only at launch.

**We do not cut:** referral triage queue, fee transparency, request-mode booking, SMS
confirm/remind journeys, or the security/audit baseline. Those are the differentiators
and the compliance floor; a launch without them is a worse HotDoc.

## 5. Risks the brief under-weights

1. **Xestro partnership is a business risk wearing an engineering hat.** The fallbacks
   de-risk the build, but *marketing* "live sync" before the API exists creates a sales
   problem. Recommendation: sell Core (request-mode) openly from day one; treat live sync
   as a named beta with pilot practices. Also: Xestro could build or bless a competing
   booking layer — the GP-portal moat (Phase 2) and multi-PMS abstraction are the hedge,
   and both are architecturally provisioned now.
2. **Provider-directory data quality.** Specialist profiles (fees, sub-specialties,
   referral requirements) go stale fast and stale fee data is worse than none — it
   undermines the trust positioning and could itself mislead. Mitigation: per-field
   "last verified" timestamps, automated quarterly re-verification nags, and a visible
   "fees confirmed <date>" stamp on profiles.
3. **SMS sender-ID and content rules.** Australian SMS sender-ID registration
   (anti-scam regime) and health-content opt-out rules need early provider engagement;
   late discovery breaks reminder journeys at launch.
4. **AHPRA review of *all* surfaces, not just reviews.** "Next available" claims,
   "no-gap" badges and practitioner bios are advertising of a regulated health service.
   The legal checkpoint in §10.3 must cover search-result presentation, not only the
   review feature.
5. **Medicare-detail handling raises the bar.** Storing Medicare/DVA numbers makes us a
   high-value breach target. Field-level encryption is specified; we additionally
   recommend *not* storing card PANs at all (Stripe tokens only) and storing Medicare
   numbers only where a practice actually requires them at booking.
6. **Triage-liability wording.** §7.3's urgency categories are practice-side workflow,
   but UI copy must never imply the *platform* assessed urgency. Copy review is in the
   definition of done for the triage queue.
7. **Account-takeover on the referral wallet.** A patient account aggregating referrals
   and appointment history across practices concentrates sensitive data behind an
   SMS-OTP login. We recommend optional email/passkey second factor and aggressive
   session controls on the patient side, not just MFA on the practice side.
