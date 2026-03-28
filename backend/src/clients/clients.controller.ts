import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.clientsService.findAll(
      user.id,
      user.role,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.findOne(id, user.id, user.role);
  }

  @Post()
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.create(dto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.remove(id, user.id, user.role);
  }
}
