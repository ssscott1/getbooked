import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service.js";
import { HealthModule } from "./modules/health/health.module.js";
import { DirectoryModule } from "./modules/directory/directory.module.js";
import { BookingModule } from "./modules/booking/booking.module.js";
import { ReferralsModule } from "./modules/referrals/referrals.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    DirectoryModule,
    BookingModule,
    ReferralsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
