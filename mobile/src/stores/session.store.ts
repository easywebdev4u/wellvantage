import { create } from 'zustand';
import { get, post, put } from '../services/api';
import type { Session, PaginatedResponse } from '../types';

interface SessionStats {
  totalSessions: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

interface SessionState {
  sessions: Session[];
  upcoming: Session[];
  past: Session[];
  stats: SessionStats | null;
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;

  fetchSessions: (status?: string, page?: number) => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  fetchPast: () => Promise<void>;
  createSession: (data: CreateSessionInput) => Promise<Session>;
  updateSession: (id: string, data: Partial<UpdateSessionInput>) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

interface CreateSessionInput {
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface UpdateSessionInput {
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  date?: string;
  startTime?: string;
  endTime?: string;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  upcoming: [],
  past: [],
  stats: null,
  total: 0,
  page: 1,
  isLoading: false,
  error: null,

  fetchSessions: async (status?, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', String(page));
      params.append('limit', '20');
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await get<PaginatedResponse<Session>>(`/sessions${query}`);
      set({ sessions: res.data, total: res.total, page: res.page, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch sessions', isLoading: false });
    }
  },

  fetchUpcoming: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await get<PaginatedResponse<Session>>('/sessions/upcoming');
      set({ upcoming: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch upcoming sessions', isLoading: false });
    }
  },

  fetchPast: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await get<PaginatedResponse<Session>>('/sessions/past');
      set({ past: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch past sessions', isLoading: false });
    }
  },

  createSession: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const session = await post<Session>('/sessions', data);
      set((s) => ({
        sessions: [session, ...s.sessions],
        upcoming: [session, ...s.upcoming],
        isLoading: false,
      }));
      return session;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create session', isLoading: false });
      throw err;
    }
  },

  updateSession: async (id, data) => {
    set({ error: null });
    try {
      const updated = await put<Session>(`/sessions/${id}`, data);
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === id ? updated : sess)),
        upcoming: data.status === 'CANCELLED'
          ? s.upcoming.filter((sess) => sess.id !== id)
          : s.upcoming.map((sess) => (sess.id === id ? updated : sess)),
        past: data.status === 'COMPLETED'
          ? [updated, ...s.past]
          : s.past,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update session' });
      throw err;
    }
  },

  fetchStats: async () => {
    try {
      const stats = await get<SessionStats>('/sessions/stats');
      set({ stats });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch stats' });
    }
  },

  clearError: () => set({ error: null }),
}));
