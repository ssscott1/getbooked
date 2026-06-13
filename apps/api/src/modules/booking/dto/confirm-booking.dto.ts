import { IsString, IsUUID, IsOptional } from "class-validator";

export class ConfirmBookingDto {
  @IsUUID()
  slotId!: string;

  @IsString()
  holdToken!: string;

  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  referralId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
