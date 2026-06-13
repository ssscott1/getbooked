import { Module } from "@nestjs/common";
import { ReferralsController } from "./referrals.controller.js";
import { ReferralsService } from "./referrals.service.js";
import { PrismaService } from "../../prisma.service.js";

@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
})
export class ReferralsModule {}
