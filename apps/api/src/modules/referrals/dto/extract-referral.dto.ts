import { IsString, IsIn, IsOptional, IsUUID } from "class-validator";

export class ExtractReferralDto {
  @IsIn(["image", "pdf"])
  kind!: "image" | "pdf";

  /** Required when kind = "image". */
  @IsOptional()
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  mediaType?: "image/jpeg" | "image/png" | "image/webp";

  /** Base64-encoded document content. */
  @IsString()
  base64!: string;

  /** If provided, the extracted data will be persisted against this patient. */
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
