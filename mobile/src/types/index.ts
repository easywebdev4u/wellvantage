export type Role = 'OWNER' | 'TRAINER' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
}

// --- Workout types ---

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  duration?: string;
  order: number;
  workoutDayId: string;
}

export interface WorkoutDay {
  id: string;
  dayNumber: number;
  muscleGroup: string;
  workoutPlanId: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  days: number;
  isPrebuilt: boolean;
  trainerId: string;
  createdAt: string;
  updatedAt: string;
  workoutDays: WorkoutDay[];
  _count?: { clients: number };
  trainer?: { id: string; name: string; email: string };
}

// --- Client types ---

export interface Client {
  id: string;
  userId: string;
  trainerId: string;
  workoutPlanId?: string;
  planName?: string;
  totalSessions: number;
  sessionsRemaining: number;
  phone?: string;
  whatsapp?: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  workoutPlan?: { id: string; name: string; days: number };
  trainer?: { id: string; name: string };
}

// --- Availability types ---

export interface Availability {
  id: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  isRepeat: boolean;
  repeatFrequency?: 'DAILY' | 'WEEKLY';
  repeatUntil?: string;
  sessionName?: string;
  createdAt: string;
  slots?: BookingSlot[];
  _virtualDate?: string;
  trainer?: { id: string; name: string };
}

export interface BookingSlot {
  id: string;
  availabilityId: string;
  clientId?: string;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED';
  bookedAt?: string;
  client?: Client;
}

// --- Session types ---

export interface Session {
  id: string;
  trainerId: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  trainer?: { id: string; name: string };
  client?: { id: string; user: { name: string; email: string } };
}
