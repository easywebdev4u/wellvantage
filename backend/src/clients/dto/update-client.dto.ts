import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  planName?: string;

  @IsOptional()
  @IsUUID()
  workoutPlanId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSessions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sessionsRemaining?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;
}
