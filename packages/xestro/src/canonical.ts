/**
 * Canonical internal model — FHIR R4-shaped (Patient, Practitioner, Schedule,
 * Slot, Appointment, DocumentReference), per docs/xestro-integration.md.
 *
 * Every PMS connector (mock today; Xestro live, Genie, Clinic to Cloud, Zedmed
 * later) maps its vendor types to/from these. Product code only ever sees this
 * model.
 */

export interface CanonicalReference {
  /** Our internal id where known. */
  id?: string;
  /** The PMS-side identifier. */
  externalId: string;
}

export interface CanonicalPatient {
  externalId?: string;
  familyName: string;
  givenName: string;
  birthDate: string; // ISO 8601 date
  /** Medicare number — handled as sensitive; field-level encrypted at rest. */
  medicareNumber?: string;
  phone?: string;
  email?: string;
}

export interface CanonicalPractitioner {
  externalId: string;
  familyName: string;
  givenName: string;
  specialty: string;
  locationExternalIds: string[];
  active: boolean;
}

export interface CanonicalLocation {
  externalId: string;
  name: string;
  timezone: string;
}

export interface CanonicalAppointmentType {
  externalId: string;
  name: string;
  durationMinutes: number;
  telehealth: boolean;
  onlineBookable: boolean;
}

/** FHIR Slot — a bookable window derived from a practitioner's Schedule. */
export interface CanonicalSlot {
  externalId: string;
  practitionerExternalId: string;
  locationExternalId: string;
  appointmentTypeExternalId: string;
  start: string; // ISO 8601 datetime
  end: string;
  status: "free" | "busy";
}

export type CanonicalAppointmentStatus =
  | "proposed"
  | "booked"
  | "cancelled"
  | "fulfilled"
  | "noshow";

export interface CanonicalAppointment {
  externalId: string;
  patient: CanonicalReference;
  practitionerExternalId: string;
  locationExternalId: string;
  appointmentTypeExternalId: string;
  start: string;
  end: string;
  status: CanonicalAppointmentStatus;
  cancellationReason?: string;
}

export interface CanonicalDocumentReference {
  externalId?: string;
  patientExternalId: string;
  category: "referral" | "intake_form" | "other";
  contentType: string;
  /** Base64 payload or storage pointer depending on transport. */
  data: string;
  description?: string;
}
