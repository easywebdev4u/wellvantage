import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateWorkoutPlanDto } from './dto/create-workout.dto';
import type { CreateExerciseDto } from './dto/create-workout.dto';
import type { UpdateWorkoutPlanDto, UpdateWorkoutDayDto, UpdateExerciseDto } from './dto/update-workout.dto';

const PLAN_INCLUDE = {
  workoutDays: {
    include: { exercises: { orderBy: { order: 'asc' as const } } },
    orderBy: { dayNumber: 'asc' as const },
  },
};

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: Role, page = 1, limit = 20) {
    const where =
      role === 'OWNER'
        ? {}
        : role === 'TRAINER'
          ? { trainerId: userId }
          : { clients: { some: { userId } } };

    const [data, total] = await Promise.all([
      this.prisma.workoutPlan.findMany({
        where,
        include: {
          workoutDays: {
            orderBy: { dayNumber: 'asc' },
            select: { id: true, dayNumber: true, muscleGroup: true },
          },
          _count: { select: { clients: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workoutPlan.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string, role: Role) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        ...PLAN_INCLUDE,
        trainer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!plan) throw new NotFoundException('Workout plan not found');
    this.assertAccess(plan.trainerId, userId, role);

    return plan;
  }

  async create(dto: CreateWorkoutPlanDto, trainerId: string) {
    return this.prisma.workoutPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        days: dto.days,
        isPrebuilt: dto.isPrebuilt ?? false,
        trainerId,
        workoutDays: dto.workoutDays
          ? {
              create: dto.workoutDays.map((day) => ({
                dayNumber: day.dayNumber,
                muscleGroup: day.muscleGroup,
                exercises: day.exercises
                  ? { create: day.exercises }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: PLAN_INCLUDE,
    });
  }

  async update(
    id: string,
    dto: UpdateWorkoutPlanDto,
    userId: string,
    role: Role,
  ) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundException('Workout plan not found');
    this.assertWriteAccess(plan.trainerId, userId, role);

    return this.prisma.workoutPlan.update({
      where: { id },
      data: dto,
      include: PLAN_INCLUDE,
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundException('Workout plan not found');
    this.assertWriteAccess(plan.trainerId, userId, role);

    await this.prisma.workoutPlan.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Workout Days ---

  async addDay(
    planId: string,
    dayNumber: number,
    muscleGroup: string,
    userId: string,
    role: Role,
  ) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Workout plan not found');
    this.assertWriteAccess(plan.trainerId, userId, role);

    return this.prisma.workoutDay.create({
      data: { workoutPlanId: planId, dayNumber, muscleGroup },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
  }

  async updateDay(dayId: string, dto: UpdateWorkoutDayDto, userId: string, role: Role) {
    const day = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: { workoutPlan: { select: { trainerId: true } } },
    });
    if (!day) throw new NotFoundException('Workout day not found');
    this.assertWriteAccess(day.workoutPlan.trainerId, userId, role);

    return this.prisma.workoutDay.update({
      where: { id: dayId },
      data: dto,
    });
  }

  async removeDay(dayId: string, userId: string, role: Role) {
    const day = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: { workoutPlan: { select: { trainerId: true } } },
    });
    if (!day) throw new NotFoundException('Workout day not found');
    this.assertWriteAccess(day.workoutPlan.trainerId, userId, role);

    await this.prisma.workoutDay.delete({ where: { id: dayId } });
    return { deleted: true };
  }

  // --- Exercises ---

  async addExercise(dayId: string, dto: CreateExerciseDto, userId: string, role: Role) {
    const day = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: { workoutPlan: { select: { trainerId: true } } },
    });
    if (!day) throw new NotFoundException('Workout day not found');
    this.assertWriteAccess(day.workoutPlan.trainerId, userId, role);

    return this.prisma.exercise.create({
      data: { ...dto, workoutDayId: dayId },
    });
  }

  async updateExercise(exerciseId: string, dto: UpdateExerciseDto, userId: string, role: Role) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutDay: {
          include: { workoutPlan: { select: { trainerId: true } } },
        },
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    this.assertWriteAccess(exercise.workoutDay.workoutPlan.trainerId, userId, role);

    return this.prisma.exercise.update({
      where: { id: exerciseId },
      data: dto,
    });
  }

  async removeExercise(exerciseId: string, userId: string, role: Role) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutDay: {
          include: { workoutPlan: { select: { trainerId: true } } },
        },
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    this.assertWriteAccess(exercise.workoutDay.workoutPlan.trainerId, userId, role);

    await this.prisma.exercise.delete({ where: { id: exerciseId } });
    return { deleted: true };
  }

  // --- Access control helpers ---

  private assertAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'OWNER') return;
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only access your own plans');
    }
    // CLIENT access is handled by the query filter
  }

  private assertWriteAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot modify workout plans');
    }
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only modify your own plans');
    }
  }
}
