import { IsOptional, IsString, IsUUID } from "class-validator";

export class HoldSlotDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
