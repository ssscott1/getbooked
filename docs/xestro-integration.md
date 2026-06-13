# Xestro Integration — Target Contract, Mocks, Fallbacks

Reality check (brief §8): Xestro does not publicly document an open third-party booking
API. This document is therefore written as **the contract we will negotiate**, and the
codebase treats it as an interface to be implemented — `PmsConnector` in
[`packages/xestro/src/connector.ts`](../packages/xestro/src/connector.ts) — with a mock
and two production fallback modes available regardless of partnership timeline.

## 1. Target API contract (what we ask Xestro for)

### Auth
- OAuth 2.0 **client-credentials per practice connection**, established through a
  practice-admin consent flow in the Xestro UI.
- Scoped tokens: `availability:read`, `appointments:write`, `patients:read`,
  `patients:write`, `documents:write`, `appointment-types:read`.
- Token lifetime ≤ 1 h; refresh via re-grant; revocation kills sync within one cycle.

### Read
| Resource | Notes |
|---|---|
| Practitioners | id, name, specialty, locations, active flag |
| Locations | id, name, address, timezone |
| Appointment types | id, name, duration, telehealth flag, online-bookable flag |
| Availability / free slots | **windowed query** (`from`,`to`, max 60 days), per practitioner+location+type |
| Appointment status changes | polling endpoint as webhook backstop (cursor-based) |

### Write
- `createAppointment` — **idempotency key required**; returns `SLOT_TAKEN` conflict
  rather than double-booking (PMS wins).
- `updateAppointment` / `cancelAppointment` (reason coded).
- `matchOrCreatePatient` — deterministic match on Medicare number + DOB + surname;
  anything weaker returns `AMBIGUOUS` with candidate refs for our practice-side
  reconciliation queue. **Never auto-merge on a weak match.**
- `attachDocument` — referral PDF / intake form response to the patient file
  (content type + category coded).

### Events (webhooks)
- `appointment.created|updated|cancelled` — **regardless of origin** (front desk, phone,
  our platform). This is the load-bearing ask: cancellation events power waitlist
  backfill (§14: offer within 60 s).
- `schedule.changed` (practitioner availability), ideally `recall.triggered` (Phase 3).
- HMAC signing + timestamp for replay protection; retries with backoff; our side dedupes
  on event id.

### Standards alignment
Request FHIR R4 resource shapes where possible — `Patient`, `Practitioner`, `Schedule`,
`Slot`, `Appointment`, `DocumentReference`. Our canonical internal model
(`packages/xestro/src/canonical.ts`) is FHIR-shaped today, so additional PMS connectors
(Genie, Clinic to Cloud, Zedmed — Phase 3) implement the same interface.

### What we hand Xestro
A contract pack: this document as OpenAPI, the mock server, and a **conformance test
suite** they can run against their implementation. Their engineering gets a scoped task;
both sides get a regression gate.

## 2. Fallback modes (built, not vapourware)

| Mode | Source of truth for online slots | Confirmation | Double-booking control |
|---|---|---|---|
| **Live sync** | Xestro | Instant (unless triage-before-confirm) | Idempotent write; `SLOT_TAKEN` → recovery flow; Redis hold during checkout |
| **Managed calendar** | Our platform (practice mirrors bookable sessions in) | Instant locally; practice reconciles into Xestro via daily worklist (CSV export + on-screen copy flow) | DB unique constraint + Redis hold; online-only session blocks; reconciliation worklist catches offline collisions |
| **Request mode** | Indicative availability only | One-click practice confirm (they enter it in Xestro) | Structurally impossible — nothing confirmed until the practice confirms |

Request mode is a **permanent per-appointment-type setting**, not just a fallback — many
specialist clinics prefer it for new patients (§8.2). All comms automation applies in
every mode. If a practice's sync health degrades (heartbeat/DLQ thresholds), its
inventory automatically downgrades live-sync → request mode rather than showing stale
slots.

## 3. Sync architecture

- Integration service is **separately deployable**, owns per-practice `SyncConnection`
  state, exponential backoff, and a dead-letter queue; every inbound/outbound exchange
  is journaled as a `SyncEvent`.
- **Sync-health dashboard** visible to us *and* the practice (last successful read/write,
  webhook lag, DLQ depth).
- Conflict rule: **Xestro wins on availability.** Our cached `AvailabilitySlot` rows are
  a projection; truth is established at write time.
- **Slot hold:** Redis `SET key NX PX 300000` at checkout start (~5 min TTL), single
  claim, released on failure/abandon. Same primitive drives waitlist claim windows
  (15 min, sequential, exclusive). Implementation + tests:
  [`packages/xestro/src/slot-hold.ts`](../packages/xestro/src/slot-hold.ts).
- Patient matching lives on **our** side of the interface
  ([`packages/xestro/src/patient-match.ts`](../packages/xestro/src/patient-match.ts)) so
  the deterministic-first / reconciliation-queue behaviour is identical across PMS
  vendors.

## 4. Swap plan (mock → live)

1. Implement `XestroLiveConnector` against the negotiated contract (~3–4 weeks:
   auth+reads, writes, webhooks).
2. **Shadow mode** per pilot practice: live connector runs read-only beside the active
   mode; availability responses diffed and logged for 1–2 weeks.
3. Flip per-practice feature flag to live sync. No product-code changes — every feature
   consumes `PmsConnector`, never Xestro specifics.
4. Rollback is the same flag back to request mode; comms journeys unaffected.
