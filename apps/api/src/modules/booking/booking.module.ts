import { Module } from "@nestjs/common";
import { BookingController } from "./booking.controller.js";
import { BookingService } from "./booking.service.js";
import { PrismaService } from "../../prisma.service.js";

@Module({
  controllers: [BookingController],
  providers: [BookingService, PrismaService],
})
export class BookingModule {}
