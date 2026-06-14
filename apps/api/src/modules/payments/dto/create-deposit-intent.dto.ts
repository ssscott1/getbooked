import { IsString, IsUUID, IsOptional } from "class-validator";

export class CreateDepositIntentDto {
  @IsUUID()
  slotId!: string;

  @IsString()
  holdToken!: string;

  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  referralId?: string;
}
