import { IsString, IsUUID, IsDateString, Matches } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  clientId!: string;

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
}
