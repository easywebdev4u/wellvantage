import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClientDto } from './dto/create-client.dto';
import type { UpdateClientDto } from './dto/update-client.dto';

const CLIENT_INCLUDE = {
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
  trainer: {
    select: { id: true, name: true },
  },
  workoutPlan: {
    select: { id: true, name: true, days: true },
  },
};

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: Role, page = 1, limit = 20) {
    const where =
      role === 'OWNER'
        ? {}
        : role === 'TRAINER'
          ? { trainerId: userId }
          : { userId };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: CLIENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string, role: Role) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ...CLIENT_INCLUDE,
        _count: { select: { sessions: true, bookings: true } },
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    this.assertAccess(client.trainerId, client.userId, userId, role);

    return client;
  }

  async create(dto: CreateClientDto, trainerId: string) {
    return this.prisma.client.create({
      data: {
        userId: dto.userId,
        trainerId,
        planName: dto.planName,
        workoutPlanId: dto.workoutPlanId,
        totalSessions: dto.totalSessions,
        sessionsRemaining: dto.totalSessions,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
      },
      include: CLIENT_INCLUDE,
    });
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    userId: string,
    role: Role,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) throw new NotFoundException('Client not found');
    this.assertWriteAccess(client.trainerId, userId, role);

    return this.prisma.client.update({
      where: { id },
      data: dto,
      include: CLIENT_INCLUDE,
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) throw new NotFoundException('Client not found');
    this.assertWriteAccess(client.trainerId, userId, role);

    await this.prisma.client.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Access control helpers ---

  private assertAccess(
    trainerId: string,
    clientUserId: string,
    userId: string,
    role: Role,
  ) {
    if (role === 'OWNER') return;
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only access your own clients');
    }
    if (role === 'CLIENT' && clientUserId !== userId) {
      throw new ForbiddenException('You can only access your own profile');
    }
  }

  private assertWriteAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot modify client records');
    }
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only modify your own clients');
    }
  }
}
