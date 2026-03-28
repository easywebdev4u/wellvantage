import { IsEnum } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class UpdateSessionDto {
  @IsEnum(SessionStatus, {
    message: 'status must be one of: UPCOMING, COMPLETED, CANCELLED',
  })
  status!: SessionStatus;
}
