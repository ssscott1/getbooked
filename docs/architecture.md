# Architecture — GetBooked (Project Specialist-First)

## System overview

Two surfaces, one backend, with the PMS integration isolated behind an interface.

```
                ┌─────────────────────────┐   ┌─────────────────────────┐
                │  Consumer marketplace   │   │     Practice portal     │
                │  Next.js (SSR, SEO)     │   │     Next.js (SPA-ish)   │
                └───────────┬─────────────┘   └───────────┬─────────────┘
                            │            HTTPS            │
                ┌───────────▼─────────────────────────────▼─────────────┐
                │              Core API — NestJS modular monolith       │
                │  modules: directory · booking · referrals · comms     │
                │  fees · waitlist · billing · admin · audit            │
                └──────┬──────────────┬──────────────┬─────────────┬────┘
                       │              │              │             │
                 PostgreSQL        Redis          BullMQ       S3 (Sydney,
                 (Sydney)      (slot holds)      (queues:      encrypted —
                       │                       sync, message    referral docs)
                       │                        journeys)
                ┌──────▼────────────────────────────────────────────────┐
                │   Integration service (separately deployable)         │
                │   canonical FHIR-shaped model · PmsConnector iface    │
                │   per-practice sync state · backoff · DLQ             │
                │   ┌──────────┐ ┌──────────────────┐ ┌──────────────┐  │
                │   │ Mock     │ │ ManagedCalendar  │ │ XestroLive   │  │
                │   │ connector│ │ / RequestMode    │ │ (post-deal)  │  │
                │   └──────────┘ └──────────────────┘ └──────────────┘  │
                └───────────────────────────────────────────────────────┘
```

## Stack decisions (per brief §11, with rationale)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind | SSR marketplace pages for SEO (`schema.org/Physician` markup); same framework for portal. |
| Backend | NestJS modular monolith | Modules map 1:1 to domains; integration service is its own deployable in the same monorepo. |
| Data | PostgreSQL (RDS Sydney) | Single relational source of truth. See `data-model.md`. |
| Cache/locks | Redis (ElastiCache Sydney) | Slot holds (TTL ~5 min), claim windows, rate limits. |
| Queues | BullMQ on Redis | Sync jobs, message journeys, webhook fan-out, dead-letter queues. |
| Objects | S3 Sydney, SSE-KMS | Referral documents, intake responses. Pre-signed, short-lived URLs only. |
| SMS | Twilio/Sinch AU sender ID | Two-way; replies write appointment status back. |
| Payments | Stripe + Stripe Billing | Patient deposits (optional, Phase-gated) + practice SaaS subscriptions. |
| AI | Claude API (`claude-opus-4-8`) | Referral extraction + synonym mapping. See §AI below. |
| Infra | AWS Sydney, Terraform, GitHub Actions | Preview environments per PR; Sentry; uptime monitoring. |

## Monorepo layout

```
apps/
  web/        Next.js — marketplace + practice portal
  api/        NestJS — core API + integration service entrypoints
packages/
  db/         Prisma schema — canonical data model (see data-model.md)
  xestro/     PMS integration: canonical FHIR-shaped types, PmsConnector
              interface (= the Xestro target contract), mock connector,
              slot-hold + patient-match primitives
  ai/         Claude API module: referral extraction, synonym mapping,
              deterministic expiry computation
docs/         architecture, data model, proposal, integration contract
```

## Booking path (the 99.9% path)

1. Search → directory query (Postgres + cached availability). Target p95 < 500 ms.
2. Slot selection → **slot hold** in Redis (`SET NX PX 300000`). One hold per slot.
3. Checkout (referral upload, fee estimate display, OTP) — all inside the hold TTL.
4. Confirm →
   - **Live-sync mode:** write appointment to PMS with an idempotency key. PMS wins
     conflicts: on `SLOT_TAKEN`, release hold, show recovery flow with alternatives.
   - **Request mode:** persist a `REQUESTED` appointment; practice confirms in one click.
   - **Managed-calendar mode:** confirm locally (DB unique constraint on slot) and put
     the appointment on the practice's reconciliation worklist.
5. Post-confirm: message journey enqueued (confirmation → referral chaser → reminders →
   two-way confirm SMS → day-of details).

Graceful degradation: if a practice's sync connection is unhealthy (heartbeat/DLQ
thresholds), its bookable inventory automatically drops to request mode rather than
showing stale availability.

## Waitlist backfill

Cancellation event (webhook or reconciliation) → waitlist matcher ranks opted-in
patients (priority: clinical urgency category set at triage, then wait time) → offers go
out sequentially via SMS/push, each with an exclusive **claim window** (default 15 min)
using the same hold primitive as checkout — a slot can never be double-claimed. Target:
first offer within 60 s of the cancellation event (acceptance criterion §14).

## AI components (`packages/ai`)

Two narrowly-scoped, human-confirmable uses. No AI output ever auto-actions a clinical
or booking decision (§10.3).

| Use | Model | Pattern |
|---|---|---|
| Referral extraction | `claude-opus-4-8` | One `messages.parse()` call, vision input (photo/PDF), strict Zod schema via structured outputs, adaptive thinking. Per-field confidence; sub-threshold fields highlighted for human review. |
| Search synonym mapping | `claude-opus-4-8` | Curated static map first (no API call for common terms); model fallback with structured output for the long tail; results cached in Postgres so each novel term is resolved once. |

**Data-residency gate (hard rule, §10.1):** referral documents are identifiable health
information. They may only be sent to an AI endpoint under an approved Australian-region/
compliant configuration, or after de-identification. The module takes
`ANTHROPIC_BASE_URL` so traffic is pinned to the approved endpoint, and ships a redaction
pre-pass. Synonym mapping operates on search terms not linked to patient identity.
Expiry/lapse logic is deterministic code (`computeReferralExpiry`), not model output.

## Security & privacy architecture (§10)

- **Trust rules enforced structurally, not by policy:** there is no code path that
  suggests an alternative provider inside an active booking flow; ranking inputs are
  relevance + availability only (no paid-placement field exists in the data model); no
  analytics/advertising exporter has access to patient-identifiable tables.
- TLS 1.2+ everywhere; AES-256 at rest; **field-level encryption** (KMS envelope) for
  Medicare/DVA numbers; documents in encrypted S3 with short-lived pre-signed access.
- AuthN: practice users — email + MFA (TOTP/passkey); patients — SMS OTP, optional
  second factor. AuthZ: RBAC (owner / practice manager / reception / practitioner-RO /
  platform admin) enforced in a single guard layer.
- **AuditLog** is append-only and written via the same transaction as the action for
  every patient-data read/write, settings change, and support impersonation
  (impersonation requires recorded consent).
- Backups encrypted, in-region. NDB-scheme breach runbook. Data export (portability) and
  deletion workflows are first-class admin features, not scripts.
- OWASP ASVS L2 baseline; pen test pre-launch (M5); ISO 27001 control mapping tracked
  from day one.

## Performance targets

| Path | Target |
|---|---|
| Search results | < 500 ms p95 (Postgres FTS + cached next-available) |
| Availability lookup | < 1.5 s p95 (windowed, cached with short TTL; PMS wins conflicts at write time) |
| Booking path uptime | 99.9 %, with automatic degradation to request mode |
| Cancellation → first waitlist offer | < 60 s |
