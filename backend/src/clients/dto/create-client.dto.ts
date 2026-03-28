import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClientDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  planName?: string;

  @IsOptional()
  @IsUUID()
  workoutPlanId?: string;

  @IsInt()
  @Min(0)
  totalSessions!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;
}
