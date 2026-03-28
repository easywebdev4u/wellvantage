import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';

import { RepeatFrequency } from '@prisma/client';

export class CreateAvailabilityDto {
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}\s*(AM|PM)$/i, {
    message: 'startTime must be in format "HH:MM AM" or "HH:MM PM"',
  })
  startTime!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}\s*(AM|PM)$/i, {
    message: 'endTime must be in format "HH:MM AM" or "HH:MM PM"',
  })
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isRepeat?: boolean;

  @IsOptional()
  @IsEnum(RepeatFrequency, { message: 'repeatFrequency must be DAILY or WEEKLY' })
  repeatFrequency?: RepeatFrequency;

  @IsOptional()
  @IsDateString()
  repeatUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionName?: string;
}
