/**
 * MockXestroConnector — deterministic in-memory implementation of the target
 * contract. Drives all development, tests, and E2E until the live API lands,
 * and doubles as the reference behaviour for the conformance suite we hand to
 * Xestro (idempotency, SLOT_TAKEN conflicts, origin-agnostic events).
 */

import type {
  CanonicalAppointment,
  CanonicalAppointmentType,
  CanonicalDocumentReference,
  CanonicalLocation,
  CanonicalPatient,
  CanonicalPractitioner,
  CanonicalSlot,
} from "../canonical.js";
import {
  SlotTakenError,
  type AvailabilityQuery,
  type CreateAppointmentInput,
  type PatientMatchResult,
  type PmsConnector,
  type PmsEvent,
  type PmsEventHandler,
} from "../connector.js";
import { matchPatient, type MatchCandidate } from "../patient-match.js";

export interface MockSeedData {
  practitioners?: CanonicalPractitioner[];
  locations?: CanonicalLocation[];
  appointmentTypes?: CanonicalAppointmentType[];
  slots?: CanonicalSlot[];
  patients?: (MatchCandidate & { givenName?: string })[];
}

let idCounter = 0;
const nextId = (prefix: string): string => `${prefix}_${++idCounter}`;

export class MockXestroConnector implements PmsConnector {
  private practitioners: CanonicalPractitioner[];
  private locations: CanonicalLocation[];
  private appointmentTypes: CanonicalAppointmentType[];
  private slots: Map<string, CanonicalSlot>;
  private patients: MatchCandidate[];
  private appointments = new Map<string, CanonicalAppointment>();
  private byIdempotencyKey = new Map<string, CanonicalAppointment>();
  private handlers: PmsEventHandler[] = [];

  constructor(seed: MockSeedData = {}) {
    this.practitioners = seed.practitioners ?? [];
    this.locations = seed.locations ?? [];
    this.appointmentTypes = seed.appointmentTypes ?? [];
    this.slots = new Map((seed.slots ?? []).map((s) => [s.externalId, s]));
    this.patients = seed.patients ?? [];
  }

  async listPractitioners(): Promise<CanonicalPractitioner[]> {
    return [...this.practitioners];
  }

  async listLocations(): Promise<CanonicalLocation[]> {
    return [...this.locations];
  }

  async listAppointmentTypes(): Promise<CanonicalAppointmentType[]> {
    return [...this.appointmentTypes];
  }

  async getAvailability(query: AvailabilityQuery): Promise<CanonicalSlot[]> {
    return [...this.slots.values()].filter(
      (s) =>
        s.status === "free" &&
        s.start >= query.from &&
        s.start < query.to &&
        (!query.practitionerExternalId ||
          s.practitionerExternalId === query.practitionerExternalId) &&
        (!query.locationExternalId || s.locationExternalId === query.locationExternalId) &&
        (!query.appointmentTypeExternalId ||
          s.appointmentTypeExternalId === query.appointmentTypeExternalId),
    );
  }

  async createAppointment(input: CreateAppointmentInput): Promise<CanonicalAppointment> {
    // Idempotency: replaying the same key returns the original appointment.
    const existing = this.byIdempotencyKey.get(input.idempotencyKey);
    if (existing) return existing;

    const slot = this.slots.get(input.slotExternalId);
    if (!slot || slot.status !== "free") {
      // PMS wins: the front desk got there first.
      throw new SlotTakenError(input.slotExternalId);
    }

    slot.status = "busy";
    const appointment: CanonicalAppointment = {
      externalId: nextId("appt"),
      patient: { externalId: input.patientExternalId },
      practitionerExternalId: slot.practitionerExternalId,
      locationExternalId: slot.locationExternalId,
      appointmentTypeExternalId: input.appointmentTypeExternalId,
      start: slot.start,
      end: slot.end,
      status: "booked",
    };
    this.appointments.set(appointment.externalId, appointment);
    this.byIdempotencyKey.set(input.idempotencyKey, appointment);
    this.emit({
      type: "appointment.created",
      eventId: nextId("evt"),
      occurredAt: new Date().toISOString(),
      appointment,
    });
    return appointment;
  }

  async cancelAppointment(appointmentExternalId: string, reason: string): Promise<void> {
    const appointment = this.appointments.get(appointmentExternalId);
    if (!appointment) throw new Error(`Unknown appointment ${appointmentExternalId}`);
    appointment.status = "cancelled";
    appointment.cancellationReason = reason;
    // Free the slot again — this is what triggers waitlist backfill downstream.
    for (const slot of this.slots.values()) {
      if (
        slot.practitionerExternalId === appointment.practitionerExternalId &&
        slot.start === appointment.start
      ) {
        slot.status = "free";
      }
    }
    this.emit({
      type: "appointment.cancelled",
      eventId: nextId("evt"),
      occurredAt: new Date().toISOString(),
      appointment,
    });
  }

  async matchOrCreatePatient(patient: CanonicalPatient): Promise<PatientMatchResult> {
    const decision = matchPatient(patient, this.patients);
    if (decision.kind === "deterministic") {
      return { kind: "matched", patientExternalId: decision.externalId };
    }
    if (decision.kind === "ambiguous") {
      return { kind: "ambiguous", candidateExternalIds: decision.candidateExternalIds };
    }
    const created: MatchCandidate = {
      externalId: nextId("pat"),
      familyName: patient.familyName,
      birthDate: patient.birthDate,
      ...(patient.medicareNumber !== undefined
        ? { medicareNumber: patient.medicareNumber }
        : {}),
    };
    this.patients.push(created);
    return { kind: "created", patientExternalId: created.externalId };
  }

  async attachDocument(_doc: CanonicalDocumentReference): Promise<{ externalId: string }> {
    return { externalId: nextId("doc") };
  }

  onEvent(handler: PmsEventHandler): void {
    this.handlers.push(handler);
  }

  /** Test helper: simulate a front-desk action inside Xestro (origin-agnostic events). */
  simulateFrontDeskBooking(slotExternalId: string): CanonicalAppointment {
    const slot = this.slots.get(slotExternalId);
    if (!slot || slot.status !== "free") throw new SlotTakenError(slotExternalId);
    slot.status = "busy";
    const appointment: CanonicalAppointment = {
      externalId: nextId("appt"),
      patient: { externalId: nextId("pat") },
      practitionerExternalId: slot.practitionerExternalId,
      locationExternalId: slot.locationExternalId,
      appointmentTypeExternalId: slot.appointmentTypeExternalId,
      start: slot.start,
      end: slot.end,
      status: "booked",
    };
    this.appointments.set(appointment.externalId, appointment);
    this.emit({
      type: "appointment.created",
      eventId: nextId("evt"),
      occurredAt: new Date().toISOString(),
      appointment,
    });
    return appointment;
  }

  private emit(event: PmsEvent): void {
    for (const handler of this.handlers) void handler(event);
  }
}
