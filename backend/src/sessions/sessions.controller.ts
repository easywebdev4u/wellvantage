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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import type { SessionStatus } from '@prisma/client';

@Controller('sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
    @Query('status') status?: SessionStatus,
  ) {
    return this.sessionsService.findAll(
      user.id,
      user.role,
      pagination.page,
      pagination.limit,
      status,
    );
  }

  @Get('upcoming')
  findUpcoming(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.sessionsService.findUpcoming(
      user.id,
      user.role,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('past')
  findPast(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.sessionsService.findPast(
      user.id,
      user.role,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.getStats(user.id, user.role);
  }

  @Post()
  @Roles('OWNER', 'TRAINER')
  create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('OWNER', 'TRAINER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.update(id, dto.status, user.id, user.role);
  }

  @Delete(':id')
  @Roles('OWNER', 'TRAINER')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.remove(id, user.id, user.role);
  }
}
