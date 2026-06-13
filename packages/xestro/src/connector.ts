/**
 * PmsConnector — the integration interface every product feature consumes.
 *
 * This interface IS the target contract we negotiate with Xestro
 * (docs/xestro-integration.md §1). Implementations:
 *  - MockXestroConnector (dev/test/E2E, webhook-simulating)
 *  - XestroLiveConnector (post-partnership; swap behind a per-practice flag)
 *  - Managed-calendar and request modes bypass availability writes entirely
 *    (the platform/practice is the confirmer) but reuse the same read shapes.
 */

import type {
  CanonicalAppointment,
  CanonicalAppointmentType,
  CanonicalDocumentReference,
  CanonicalLocation,
  CanonicalPatient,
  CanonicalPractitioner,
  CanonicalSlot,
} from "./canonical.js";

// ── Errors ──────────────────────────────────────────────────────────────────

/** PMS wins availability conflicts: surfaced when a write loses the race. */
export class SlotTakenError extends Error {
  constructor(public readonly slotExternalId: string) {
    super(`Slot ${slotExternalId} is no longer available`);
    this.name = "SlotTakenError";
  }
}

// ── Patient matching ────────────────────────────────────────────────────────

export type PatientMatchResult =
  | { kind: "matched"; patientExternalId: string }
  | { kind: "created"; patientExternalId: string }
  /**
   * Weak/probabilistic match — NEVER auto-merged. Routed to the practice-side
   * reconciliation queue with candidates for a human decision.
   */
  | { kind: "ambiguous"; candidateExternalIds: string[] };

// ── Webhook events ──────────────────────────────────────────────────────────

export type PmsEvent =
  | {
      type: "appointment.created" | "appointment.updated" | "appointment.cancelled";
      /** Fires regardless of origin: front desk, phone, or our platform. */
      eventId: string;
      occurredAt: string;
      appointment: CanonicalAppointment;
    }
  | {
      type: "schedule.changed";
      eventId: string;
      occurredAt: string;
      practitionerExternalId: string;
    };

export type PmsEventHandler = (event: PmsEvent) => void | Promise<void>;

// ── The contract ────────────────────────────────────────────────────────────

export interface AvailabilityQuery {
  practitionerExternalId?: string;
  locationExternalId?: string;
  appointmentTypeExternalId?: string;
  /** Windowed query — contract caps the window at 60 days. */
  from: string;
  to: string;
}

export interface CreateAppointmentInput {
  /** Required — duplicate keys must return the original appointment, not a duplicate booking. */
  idempotencyKey: string;
  slotExternalId: string;
  patientExternalId: string;
  appointmentTypeExternalId: string;
  notes?: string;
}

export interface PmsConnector {
  // Read
  listPractitioners(): Promise<CanonicalPractitioner[]>;
  listLocations(): Promise<CanonicalLocation[]>;
  listAppointmentTypes(): Promise<CanonicalAppointmentType[]>;
  getAvailability(query: AvailabilityQuery): Promise<CanonicalSlot[]>;

  // Write
  /** @throws SlotTakenError when the PMS has already filled the slot (PMS wins). */
  createAppointment(input: CreateAppointmentInput): Promise<CanonicalAppointment>;
  cancelAppointment(appointmentExternalId: string, reason: string): Promise<void>;
  matchOrCreatePatient(patient: CanonicalPatient): Promise<PatientMatchResult>;
  attachDocument(doc: CanonicalDocumentReference): Promise<{ externalId: string }>;

  // Events (webhooks in production; synchronous emit in the mock)
  onEvent(handler: PmsEventHandler): void;
}
