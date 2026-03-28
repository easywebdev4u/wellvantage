import { IsUUID } from 'class-validator';

export class BookSlotDto {
  @IsUUID()
  clientId!: string;
}
