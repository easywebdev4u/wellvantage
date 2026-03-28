import { IsEnum } from 'class-validator';
import { SlotStatus } from '@prisma/client';

export class UpdateSlotStatusDto {
  @IsEnum(SlotStatus, {
    message: 'status must be one of: OPEN, BOOKED, CANCELLED',
  })
  status!: SlotStatus;
}
