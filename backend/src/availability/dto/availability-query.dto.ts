import { IsInt, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator';

export class AvailabilityQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 100;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
