import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";
import { CreateDepositIntentDto } from "./dto/create-deposit-intent.dto.js";

// Avoid complex imported types in decorated parameters (emitDecoratorMetadata + isolatedModules)
interface RawRequest {
  rawBody?: Buffer;
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("deposit-intent")
  createDepositIntent(@Body() dto: CreateDepositIntentDto) {
    return this.payments.createDepositIntent(dto);
  }

  /**
   * Stripe webhook — raw body is required for signature verification.
   * Enabled globally via NestFactory.create(..., { rawBody: true }).
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Req() req: RawRequest, @Headers("stripe-signature") sig: string) {
    return this.payments.handleWebhook(req.rawBody!, sig);
  }
}
