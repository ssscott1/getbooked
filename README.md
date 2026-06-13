# GetBooked — Project Specialist-First

Australia's first booking marketplace and patient-engagement platform built for medical
specialists, integrating with Xestro (cloud specialist PMS). Specialist-shaped where the
incumbents are GP-shaped: referral-gated booking, triage-before-confirm, informed
financial consent, and waitlist backfill — with **trust by design** (no per-booking fees,
no patient-data monetisation, no paid placement, never competing with our practices).

Brief: Sierra Bravo Capital, June 2026 (v1.0).

## Documents

| Doc | Contents |
|---|---|
| [`docs/proposal.md`](docs/proposal.md) | Developer proposal — answers to the brief's §15 open questions: Xestro mock-to-live strategy, double-booking prevention, referral OCR approach, team/milestones/de-scope, risks |
| [`docs/architecture.md`](docs/architecture.md) | System design, stack, booking path, waitlist backfill, AI components, security architecture |
| [`docs/data-model.md`](docs/data-model.md) | ERD + entity lifecycles (referral, appointment, waitlist, fees, audit) |
| [`docs/xestro-integration.md`](docs/xestro-integration.md) | The target API contract we negotiate with Xestro, mock strategy, fallback modes, swap plan |

## Repository layout

```
docs/               Architecture, data model, integration contract, proposal
packages/
  db/               Prisma schema — all §11 first-class entities
  xestro/           PMS integration layer: FHIR-shaped canonical model,
                    PmsConnector interface (= the Xestro target contract),
                    MockXestroConnector, slot-hold + patient-match primitives
  ai/               Claude API module: referral extraction (structured outputs,
                    vision), deterministic referral-expiry rules, search
                    synonym mapping
apps/               web (Next.js) and api (NestJS) — scaffolded at M2 kickoff
```

## Getting started

```bash
pnpm install
pnpm typecheck     # all packages
pnpm test          # unit tests (slot holds, patient matching, referral expiry, mock PMS)
pnpm db:validate   # Prisma schema validation
```

Copy `.env.example` to `.env` for local configuration. The Claude API key is only needed
to exercise live extraction/synonym calls; everything else (including the full mock PMS)
runs without credentials.

## Non-negotiables (enforced in code, not just policy)

- Patient data is never sold, shared with insurers/brokers/advertisers, or used to
  market third-party services (§10.1).
- No code path redirects a booking toward a different provider; ranking has no paid
  placement (§10.1) — the data model has no field for it.
- All patient data stays in Australian-region infrastructure; AI processing of
  identifiable documents is gated on an approved compliant configuration
  (`packages/ai/src/client.ts`).
- AI output pre-fills and suggests; humans confirm. Nothing clinical is auto-actioned
  (§10.3).
- Every patient-data access is audit-logged (§7.7, §10.2).
