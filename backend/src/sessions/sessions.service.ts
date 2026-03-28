import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Role, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSessionDto } from './dto/create-session.dto';

const SESSION_INCLUDE = {
  trainer: {
    select: { id: true, name: true },
  },
  client: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
};

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    role: Role,
    page = 1,
    limit = 20,
    status?: SessionStatus,
  ) {
    const where: Record<string, unknown> = {};

    if (role === 'TRAINER') {
      where.trainerId = userId;
    } else if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException('Client profile not found');
      where.clientId = client.id;
    }
    // OWNER sees all — no filter

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        include: SESSION_INCLUDE,
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findUpcoming(userId: string, role: Role, page = 1, limit = 20) {
    return this.findAll(userId, role, page, limit, 'UPCOMING');
  }

  async findPast(userId: string, role: Role, page = 1, limit = 20) {
    return this.findAll(userId, role, page, limit, 'COMPLETED');
  }

  async create(dto: CreateSessionDto, trainerId: string) {
    return this.prisma.session.create({
      data: {
        trainerId,
        clientId: dto.clientId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: 'UPCOMING',
      },
      include: SESSION_INCLUDE,
    });
  }

  async update(
    id: string,
    status: SessionStatus,
    userId: string,
    role: Role,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');
    this.assertWriteAccess(session.trainerId, userId, role);

    return this.prisma.session.update({
      where: { id },
      data: { status },
      include: SESSION_INCLUDE,
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Session not found');
    this.assertWriteAccess(session.trainerId, userId, role);

    await this.prisma.session.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats(userId: string, role: Role) {
    const where: Record<string, unknown> = {};

    if (role === 'TRAINER') {
      where.trainerId = userId;
    } else if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException('Client profile not found');
      where.clientId = client.id;
    }
    // OWNER sees all — no filter

    const [upcoming, completed, cancelled, total] = await Promise.all([
      this.prisma.session.count({ where: { ...where, status: 'UPCOMING' } }),
      this.prisma.session.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.session.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.session.count({ where }),
    ]);

    return { upcoming, completed, cancelled, total };
  }

  // --- Access control helpers ---

  private assertWriteAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot modify sessions');
    }
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only modify your own sessions');
    }
  }
}
