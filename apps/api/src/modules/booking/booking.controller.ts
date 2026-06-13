import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { BookingService } from "./booking.service.js";
import { HoldSlotDto } from "./dto/hold-slot.dto.js";
import { ConfirmBookingDto } from "./dto/confirm-booking.dto.js";

@Controller()
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  /** Acquire a time-limited slot hold. Returns a hold token the client must keep. */
  @Post("slots/:slotId/hold")
  holdSlot(@Param("slotId") slotId: string, @Body() dto: HoldSlotDto) {
    return this.booking.holdSlot(slotId, dto);
  }

  /** Release a hold early (e.g. user navigates away). */
  @Delete("slots/:slotId/hold")
  @HttpCode(HttpStatus.NO_CONTENT)
  releaseHold(
    @Param("slotId") slotId: string,
    @Body("holdToken") holdToken: string
  ) {
    return this.booking.releaseHold(slotId, holdToken);
  }

  /** Convert an active hold into a confirmed appointment. */
  @Post("appointments")
  confirmBooking(@Body() dto: ConfirmBookingDto) {
    return this.booking.confirmBooking(dto);
  }
}
