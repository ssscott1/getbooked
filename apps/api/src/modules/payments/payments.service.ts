import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../../prisma.service.js";
import { BookingService } from "../booking/booking.service.js";
import type { CreateDepositIntentDto } from "./dto/create-deposit-intent.dto.js";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingService
  ) {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    this.stripe = new Stripe(key, { typescript: true });
  }

  async createDepositIntent(dto: CreateDepositIntentDto) {
    const { slotId, holdToken, patientId, referralId } = dto;

    // Validate hold is still active
    const hold = await this.booking.getHold(slotId);
    if (!hold || hold.holderId !== holdToken) {
      throw new UnprocessableEntityException(
        "Hold expired or invalid — please restart checkout"
      );
    }

    // Fetch slot + appointment type fee schedule
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: {
        practitioner: { select: { practiceId: true } },
        appointmentType: true,
      },
    });
    if (!slot) throw new NotFoundException("Slot not found");

    const feeSchedule = await this.prisma.feeSchedule.findUnique({
      where: {
        practiceId_appointmentTypeId: {
          practiceId: slot.practitioner.practiceId,
          appointmentTypeId: slot.appointmentTypeId,
        },
      },
    });

    const depositCents = feeSchedule?.depositCents;
    if (!depositCents || depositCents <= 0) {
      throw new BadRequestException(
        "No deposit is configured for this appointment type — use the direct confirm endpoint"
      );
    }

    // Store booking context in PaymentIntent metadata for webhook pick-up
    const intent = await this.stripe.paymentIntents.create({
      amount: depositCents,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      metadata: {
        slotId,
        holdToken,
        patientId,
        referralId: referralId ?? "",
        practiceId: slot.practitioner.practiceId,
        appointmentTypeId: slot.appointmentTypeId,
        locationId: slot.locationId,
      },
    });

    return {
      clientSecret: intent.client_secret,
      depositAmountCents: depositCents,
      currency: "aud",
    };
  }

  handleWebhook(rawBody: Buffer, sig: string) {
    const secret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch {
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    if (event.type === "payment_intent.succeeded") {
      void this.onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
    }

    return { received: true };
  }

  private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
    const { slotId, holdToken, patientId, referralId, practiceId, appointmentTypeId, locationId } =
      intent.metadata;

    if (!slotId || !patientId || !practiceId || !appointmentTypeId || !locationId) {
      this.logger.warn(`payment_intent.succeeded missing metadata: ${intent.id}`);
      return;
    }

    // Safe to treat as strings now that we've guarded above
    const safeSlotId = slotId;
    const safePatientId = patientId;
    const safePracticeId = practiceId;
    const safeTypeId = appointmentTypeId;
    const safeLocationId = locationId;

    try {
      const appointment = await this.booking.confirmBookingFromPayment({
        slotId: safeSlotId,
        holdToken: holdToken ?? "",
        patientId: safePatientId,
        ...(referralId ? { referralId } : {}),
        practiceId: safePracticeId,
        appointmentTypeId: safeTypeId,
        locationId: safeLocationId,
        stripePaymentIntentId: intent.id,
        depositPaidCents: intent.amount,
      });

      const feeSchedule = await this.prisma.feeSchedule.findUnique({
        where: { practiceId_appointmentTypeId: { practiceId: safePracticeId, appointmentTypeId: safeTypeId } },
      });

      await this.prisma.feeEstimate.create({
        data: {
          appointmentId: appointment.id,
          feeScheduleId: feeSchedule?.id ?? null,
          consultationFeeCents: feeSchedule?.consultationFeeCents ?? null,
          medicareRebateCents: feeSchedule?.medicareRebateCents ?? null,
          estimatedGapCents: feeSchedule?.estimatedGapCents ?? null,
          depositCents: intent.amount,
        },
      });

      this.logger.log(
        `Deposit confirmed: appointment=${appointment.id} stripe=${intent.id} amount=${intent.amount}`
      );
    } catch (err) {
      // Log but don't throw — Stripe will retry on 500; a failed confirm after
      // payment succeeding requires manual investigation, not a retry loop.
      this.logger.error(`Failed to confirm booking after payment: ${String(err)}`, {
        paymentIntentId: intent.id,
        slotId,
      });
    }
  }
}
