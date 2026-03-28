import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { Role, SlotStatus, Availability } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAvailabilityDto } from './dto/create-availability.dto';

const AVAILABILITY_INCLUDE = {
  trainer: { select: { id: true, name: true } },
  slots: {
    include: {
      client: { include: { user: { select: { id: true, name: true } } } },
    },
  },
};

/** Expand a repeating availability into virtual occurrences within a date range */
function expandRepeatingSlot(
  slot: Availability & { trainer: any; slots: any[] },
  rangeStart: Date,
  rangeEnd: Date,
) {
  if (!slot.isRepeat || !slot.repeatFrequency || !slot.repeatUntil) {
    return [slot];
  }

  const results: any[] = [];
  const increment = slot.repeatFrequency === 'DAILY' ? 1 : 7;
  const until = new Date(slot.repeatUntil);
  until.setHours(23, 59, 59, 999);
  let current = new Date(slot.date);

  while (current <= until) {
    if (current >= rangeStart && current <= rangeEnd) {
      results.push({
        ...slot,
        date: new Date(current),
        // Virtual occurrences share the parent ID + date suffix for uniqueness
        _virtualDate: current.toISOString().split('T')[0],
      });
    }
    current = new Date(current);
    current.setDate(current.getDate() + increment);
  }

  return results;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    role: Role,
    page = 1,
    limit = 100,
    trainerId?: string,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    if (role === 'OWNER') {
      if (trainerId) where.trainerId = trainerId;
    } else if (role === 'TRAINER') {
      where.trainerId = userId;
    } else {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { trainerId: true },
      });
      if (!client) throw new NotFoundException('Client profile not found');
      where.trainerId = client.trainerId;
    }

    // Determine query range
    let rangeStart: Date;
    let rangeEnd: Date;

    if (date) {
      rangeStart = new Date(date);
      rangeEnd = new Date(date);
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      // Default: current month
      const now = new Date();
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch: non-repeat slots in range + repeat slots whose range overlaps
    const dbSlots = await this.prisma.availability.findMany({
      where: {
        AND: [
          where,
          {
            OR: [
              // Non-repeat: date within range
              {
                isRepeat: false,
                date: { gte: rangeStart, lte: rangeEnd },
              },
              // Repeat: start date <= rangeEnd AND repeatUntil >= rangeStart
              {
                isRepeat: true,
                date: { lte: rangeEnd },
                repeatUntil: { gte: rangeStart },
              },
            ],
          },
        ],
      },
      include: AVAILABILITY_INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Expand repeating slots into virtual occurrences
    const expanded: any[] = [];
    for (const slot of dbSlots) {
      expanded.push(...expandRepeatingSlot(slot, rangeStart, rangeEnd));
    }

    // Sort by date + startTime
    expanded.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const total = expanded.length;
    const data = expanded.slice((page - 1) * limit, page * limit);

    return { data, total, page, limit };
  }

  async create(dto: CreateAvailabilityDto, trainerId: string) {
    const slotDate = new Date(dto.date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (slotDate < today) {
      throw new BadRequestException('Cannot create availability for a past date');
    }

    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);
    if (startMinutes >= endMinutes) {
      throw new BadRequestException('Start time must be before end time');
    }
    if (endMinutes - startMinutes < 15) {
      throw new BadRequestException('Slot must be at least 15 minutes long');
    }

    // For repeat: validate range
    let repeatUntil: Date | null = null;
    if (dto.isRepeat && dto.repeatUntil) {
      repeatUntil = new Date(dto.repeatUntil);
      const daysDiff = Math.ceil((repeatUntil.getTime() - slotDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        throw new BadRequestException('Repeat period cannot exceed 90 days');
      }
      if (repeatUntil <= slotDate) {
        throw new BadRequestException('Repeat end date must be after start date');
      }
    }

    // Generate ALL dates this new slot would occupy
    const newDates = this.generateDates(
      slotDate,
      dto.isRepeat ? (dto.repeatFrequency || 'WEEKLY') : null,
      repeatUntil,
    );

    // Fetch ALL existing availability for this trainer in the new slot's full range
    const rangeEnd = repeatUntil || slotDate;
    const existingSlots = await this.prisma.availability.findMany({
      where: {
        trainerId,
        AND: [
          {
            OR: [
              { isRepeat: false, date: { gte: slotDate, lte: rangeEnd } },
              { isRepeat: true, date: { lte: rangeEnd }, repeatUntil: { gte: slotDate } },
            ],
          },
        ],
      },
    });

    // Expand existing slots into all their virtual dates
    const existingDatesWithTimes: { date: string; start: number; end: number }[] = [];
    for (const ex of existingSlots) {
      const exDates = this.generateDates(
        ex.date,
        ex.isRepeat ? (ex.repeatFrequency || 'WEEKLY') : null,
        ex.repeatUntil,
      );
      const exStart = this.timeToMinutes(ex.startTime);
      const exEnd = this.timeToMinutes(ex.endTime);
      for (const d of exDates) {
        existingDatesWithTimes.push({ date: d.toISOString().split('T')[0], start: exStart, end: exEnd });
      }
    }

    // Check every new date against every existing expanded date
    for (const newDate of newDates) {
      const newDateStr = newDate.toISOString().split('T')[0];
      for (const ex of existingDatesWithTimes) {
        if (ex.date === newDateStr && startMinutes < ex.end && endMinutes > ex.start) {
          throw new ConflictException(
            `Time overlaps on ${newDateStr}: ${dto.startTime}-${dto.endTime} conflicts with an existing slot`,
          );
        }
      }
    }

    // Store ONE row
    const created = await this.prisma.availability.create({
      data: {
        trainerId,
        date: slotDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isRepeat: dto.isRepeat ?? false,
        repeatFrequency: dto.isRepeat ? (dto.repeatFrequency as any) : null,
        repeatUntil: dto.isRepeat && dto.repeatUntil ? new Date(dto.repeatUntil) : null,
        sessionName: dto.sessionName,
      },
      include: AVAILABILITY_INCLUDE,
    });

    return created;
  }

  /** Generate all dates for a slot (single or recurring) */
  private generateDates(
    startDate: Date,
    frequency: string | null,
    until: Date | null,
  ): Date[] {
    const dates = [new Date(startDate)];
    if (!frequency || !until) return dates;

    const increment = frequency === 'DAILY' ? 1 : 7;
    let current = new Date(startDate);
    current.setDate(current.getDate() + increment);
    const end = new Date(until);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      dates.push(new Date(current));
      current = new Date(current);
      current.setDate(current.getDate() + increment);
    }
    return dates;
  }

  private timeToMinutes(time: string): number {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  async remove(id: string, userId: string, role: Role) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });
    if (!availability) throw new NotFoundException('Availability not found');
    this.assertWriteAccess(availability.trainerId, userId, role);

    await this.prisma.availability.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Booking Slots ---

  async bookSlot(availabilityId: string, clientId: string, userId: string, role: Role) {
    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!availability) throw new NotFoundException('Availability not found');
    this.assertWriteAccess(availability.trainerId, userId, role);

    return this.prisma.bookingSlot.create({
      data: {
        availabilityId,
        clientId,
        status: 'BOOKED',
        bookedAt: new Date(),
      },
      include: {
        client: { include: { user: { select: { id: true, name: true } } } },
        availability: {
          select: { id: true, date: true, startTime: true, endTime: true },
        },
      },
    });
  }

  async getSlots(availabilityId: string, userId: string, role: Role) {
    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!availability) throw new NotFoundException('Availability not found');
    this.assertAccess(availability.trainerId, userId, role);

    return this.prisma.bookingSlot.findMany({
      where: { availabilityId },
      include: {
        client: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  }

  async updateSlot(slotId: string, status: SlotStatus, userId: string, role: Role) {
    const slot = await this.prisma.bookingSlot.findUnique({
      where: { id: slotId },
      include: { availability: { select: { trainerId: true } } },
    });
    if (!slot) throw new NotFoundException('Booking slot not found');
    this.assertWriteAccess(slot.availability.trainerId, userId, role);

    return this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: { status, bookedAt: status === 'BOOKED' ? new Date() : undefined },
      include: {
        client: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  }

  async removeSlot(slotId: string, userId: string, role: Role) {
    const slot = await this.prisma.bookingSlot.findUnique({
      where: { id: slotId },
      include: { availability: { select: { trainerId: true } } },
    });
    if (!slot) throw new NotFoundException('Booking slot not found');
    this.assertWriteAccess(slot.availability.trainerId, userId, role);

    await this.prisma.bookingSlot.delete({ where: { id: slotId } });
    return { deleted: true };
  }

  // --- Access control ---

  private assertAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'OWNER') return;
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only access your own availability');
    }
  }

  private assertWriteAccess(trainerId: string, userId: string, role: Role) {
    if (role === 'CLIENT') {
      throw new ForbiddenException('Clients cannot modify availability');
    }
    if (role === 'TRAINER' && trainerId !== userId) {
      throw new ForbiddenException('You can only modify your own availability');
    }
  }
}
