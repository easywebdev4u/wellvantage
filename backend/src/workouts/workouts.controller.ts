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
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutPlanDto, CreateWorkoutDayDto, CreateExerciseDto } from './dto/create-workout.dto';
import { UpdateWorkoutPlanDto, UpdateWorkoutDayDto, UpdateExerciseDto } from './dto/update-workout.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

@Controller('workouts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  // --- Workout Plans ---

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.workoutsService.findAll(
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
    return this.workoutsService.findOne(id, user.id, user.role);
  }

  @Post()
  @Roles('OWNER', 'TRAINER')
  create(
    @Body() dto: CreateWorkoutPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.create(dto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.remove(id, user.id, user.role);
  }

  // --- Workout Days ---

  @Post(':planId/days')
  @Roles('OWNER', 'TRAINER')
  addDay(
    @Param('planId') planId: string,
    @Body() dto: CreateWorkoutDayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.addDay(
      planId,
      dto.dayNumber,
      dto.muscleGroup,
      user.id,
      user.role,
    );
  }

  @Put('days/:dayId')
  updateDay(
    @Param('dayId') dayId: string,
    @Body() dto: UpdateWorkoutDayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.updateDay(dayId, dto, user.id, user.role);
  }

  @Delete('days/:dayId')
  removeDay(
    @Param('dayId') dayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.removeDay(dayId, user.id, user.role);
  }

  // --- Exercises ---

  @Post('days/:dayId/exercises')
  @Roles('OWNER', 'TRAINER')
  addExercise(
    @Param('dayId') dayId: string,
    @Body() dto: CreateExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.addExercise(dayId, dto, user.id, user.role);
  }

  @Put('exercises/:exerciseId')
  updateExercise(
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdateExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.updateExercise(exerciseId, dto, user.id, user.role);
  }

  @Delete('exercises/:exerciseId')
  removeExercise(
    @Param('exerciseId') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.removeExercise(exerciseId, user.id, user.role);
  }
}
