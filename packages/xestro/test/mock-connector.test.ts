import { describe, expect, it } from "vitest";
import { MockXestroConnector } from "../src/mock/mock-connector.js";
import { SlotTakenError, type PmsEvent } from "../src/connector.js";
import type { CanonicalSlot } from "../src/canonical.js";

const slot = (id: string, start: string): CanonicalSlot => ({
  externalId: id,
  practitionerExternalId: "dr-a",
  locationExternalId: "loc-1",
  appointmentTypeExternalId: "new-patient",
  start,
  end: start.replace("T09:00", "T09:30"),
  status: "free",
});

const seed = () => ({
  slots: [slot("s1", "2026-07-01T09:00:00+10:00"), slot("s2", "2026-07-02T09:00:00+10:00")],
});

describe("MockXestroConnector", () => {
  it("createAppointment is idempotent on the idempotency key", async () => {
    const pms = new MockXestroConnector(seed());
    const input = {
      idempotencyKey: "k1",
      slotExternalId: "s1",
      patientExternalId: "p1",
      appointmentTypeExternalId: "new-patient",
    };
    const first = await pms.createAppointment(input);
    const replay = await pms.createAppointment(input);
    expect(replay.externalId).toBe(first.externalId);
  });

  it("throws SlotTakenError when the front desk wins the race (PMS wins)", async () => {
    const pms = new MockXestroConnector(seed());
    pms.simulateFrontDeskBooking("s1");
    await expect(
      pms.createAppointment({
        idempotencyKey: "k2",
        slotExternalId: "s1",
        patientExternalId: "p1",
        appointmentTypeExternalId: "new-patient",
      }),
    ).rejects.toBeInstanceOf(SlotTakenError);
  });

  it("emits origin-agnostic events, including cancellations that free the slot", async () => {
    const pms = new MockXestroConnector(seed());
    const events: PmsEvent[] = [];
    pms.onEvent((e) => {
      events.push(e);
    });

    const appt = await pms.createAppointment({
      idempotencyKey: "k3",
      slotExternalId: "s1",
      patientExternalId: "p1",
      appointmentTypeExternalId: "new-patient",
    });
    await pms.cancelAppointment(appt.externalId, "patient unwell");

    expect(events.map((e) => e.type)).toEqual([
      "appointment.created",
      "appointment.cancelled",
    ]);
    // Slot is free again — this event is what triggers waitlist backfill.
    const avail = await pms.getAvailability({
      from: "2026-07-01T00:00:00+10:00",
      to: "2026-07-03T00:00:00+10:00",
    });
    expect(avail.map((s) => s.externalId)).toContain("s1");
  });

  it("windowed availability query filters by window and practitioner", async () => {
    const pms = new MockXestroConnector(seed());
    const avail = await pms.getAvailability({
      from: "2026-07-02T00:00:00+10:00",
      to: "2026-07-03T00:00:00+10:00",
      practitionerExternalId: "dr-a",
    });
    expect(avail.map((s) => s.externalId)).toEqual(["s2"]);
  });
});
