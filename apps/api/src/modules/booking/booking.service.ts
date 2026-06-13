import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  InMemorySlotHoldStore,
  CHECKOUT_HOLD_TTL_MS,
} from "@getbooked/xestro";
import { PrismaService } from "../../prisma.service.js";
import type { HoldSlotDto } from "./dto/hold-slot.dto.js";
import type { ConfirmBookingDto } from "./dto/confirm-booking.dto.js";

@Injectable()
export class BookingService {
  // Single in-process hold store — swap for RedisSlotHoldStore in production.
  private readonly holds = new InMemorySlotHoldStore();

  constructor(private readonly prisma: PrismaService) {}

  async holdSlot(slotId: string, dto: HoldSlotDto) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: { appointments: { where: { status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED"] } } } },
    });
    if (!slot) throw new NotFoundException("Slot not found");
    if (slot.appointments.length > 0) {
      throw new ConflictException("Slot is no longer available");
    }

    const holderId = dto.patientId ?? `anon-${randomUUID()}`;
    const hold = await this.holds.acquire(slotId, holderId, CHECKOUT_HOLD_TTL_MS);
    if (!hold) {
      throw new ConflictException(
        "Slot is held by another session — try a different time"
      );
    }

    return {
      slotId,
      holdToken: hold.holderId,
      expiresAt: new Date(hold.expiresAt).toISOString(),
      ttlSeconds: Math.round(CHECKOUT_HOLD_TTL_MS / 1000),
    };
  }

  async releaseHold(slotId: string, holdToken: string) {
    await this.holds.release(slotId, holdToken);
  }

  async confirmBooking(dto: ConfirmBookingDto) {
    const { slotId, holdToken, patientId, referralId } = dto;

    const hold = await this.holds.get(slotId);
    if (!hold || hold.holderId !== holdToken) {
      throw new UnprocessableEntityException(
        "Hold expired or invalid — please restart checkout"
      );
    }

    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: {
        practitioner: { select: { practiceId: true } },
        appointments: { where: { status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED"] } } },
      },
    });
    if (!slot) throw new NotFoundException("Slot not found");
    if (slot.appointments.length > 0) {
      throw new ConflictException("Slot is no longer available");
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        practiceId: slot.practitioner.practiceId,
        practitionerId: slot.practitionerId,
        locationId: slot.locationId,
        appointmentTypeId: slot.appointmentTypeId,
        slotId,
        patientId,
        referralId: referralId ?? null,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "CONFIRMED",
        source: "MARKETPLACE",
      },
    });

    // Release hold after successful commit.
    await this.holds.release(slotId, holdToken);

    return appointment;
  }
}
