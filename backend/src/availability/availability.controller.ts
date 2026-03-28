import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateSlotStatusDto } from './dto/update-slot.dto';
import { BookSlotDto } from './dto/book-slot.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

@Controller('availability')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availabilityService.findAll(
      user.id,
      user.role,
      query.page,
      query.limit,
      query.trainerId,
      query.date,
      query.startDate,
      query.endDate,
    );
  }

  @Post()
  @Roles('OWNER', 'TRAINER')
  create(
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.create(dto, user.id);
  }

  @Delete(':id')
  @Roles('OWNER', 'TRAINER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.remove(id, user.id, user.role);
  }

  @Post(':id/book')
  @Roles('OWNER', 'TRAINER')
  bookSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.bookSlot(id, dto.clientId, user.id, user.role);
  }

  @Get(':id/slots')
  getSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.getSlots(id, user.id, user.role);
  }

  @Patch('slots/:slotId')
  @Roles('OWNER', 'TRAINER')
  updateSlot(
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateSlotStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.updateSlot(slotId, dto.status, user.id, user.role);
  }

  @Delete('slots/:slotId')
  @Roles('OWNER', 'TRAINER')
  removeSlot(
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.availabilityService.removeSlot(slotId, user.id, user.role);
  }
}
