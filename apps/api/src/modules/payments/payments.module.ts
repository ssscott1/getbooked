import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PrismaService } from "../../prisma.service.js";
import { BookingService } from "../booking/booking.service.js";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, BookingService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
