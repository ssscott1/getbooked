import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { ReferralsService } from "./referrals.service.js";
import { ExtractReferralDto } from "./dto/extract-referral.dto.js";

@Controller("referrals")
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  /**
   * Extract structured data from a referral document.
   * Input: base64-encoded image or PDF + media type.
   * Output: extracted fields with per-field confidence + fields needing review.
   *
   * DATA RESIDENCY: this endpoint must only be called after confirming
   * ANTHROPIC_BASE_URL is set to an AU-region/approved endpoint (§10.1).
   */
  @Post("extract")
  extract(@Body() dto: ExtractReferralDto) {
    return this.referrals.extract(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.referrals.findOne(id);
  }
}
