import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  createAiClient,
  extractReferral,
  fieldsNeedingReview,
  type ReferralDocumentInput,
} from "@getbooked/ai";
import { PrismaService } from "../../prisma.service.js";
import type { ExtractReferralDto } from "./dto/extract-referral.dto.js";

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async extract(dto: ExtractReferralDto) {
    const client = createAiClient();

    let document: ReferralDocumentInput;
    if (dto.kind === "pdf") {
      document = { kind: "pdf", base64: dto.base64 };
    } else {
      if (!dto.mediaType) {
        throw new BadRequestException("mediaType is required for image documents");
      }
      document = { kind: "image", mediaType: dto.mediaType, base64: dto.base64 };
    }

    const result = await extractReferral(client, document);
    const review = fieldsNeedingReview(result.extraction);

    return {
      extraction: result.extraction,
      model: result.model,
      fieldsNeedingReview: review,
      requiresHumanReview: review.length > 0,
    };
  }

  async findOne(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: { patient: true, documents: true },
    });
    if (!referral) throw new NotFoundException("Referral not found");
    return referral;
  }
}
