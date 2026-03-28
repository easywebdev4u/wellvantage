import { create } from 'zustand';
import { get, post, del } from '../services/api';
import type { Availability, PaginatedResponse } from '../types';

interface AvailabilityState {
  slots: Availability[];
  currentStartDate: string | null;
  currentEndDate: string | null;
  isLoading: boolean;
  error: string | null;

  fetchAvailability: (trainerId?: string, date?: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchMonth: (year: number, month: number) => Promise<void>;
  createAvailability: (data: CreateAvailabilityInput) => Promise<Availability>;
  deleteAvailability: (id: string) => Promise<void>;
  bookSlot: (availabilityId: string, clientId: string) => Promise<void>;
  clearError: () => void;
}

interface CreateAvailabilityInput {
  date: string;
  startTime: string;
  endTime: string;
  isRepeat: boolean;
  repeatFrequency?: 'WEEKLY' | 'DAILY';
  repeatUntil?: string;
  sessionName?: string;
}

export const useAvailabilityStore = create<AvailabilityState>((set, getState) => ({
  slots: [],
  currentStartDate: null,
  currentEndDate: null,
  isLoading: false,
  error: null,

  fetchAvailability: async (trainerId?, date?, startDate?, endDate?) => {
    set({ isLoading: true, error: null });
    if (startDate && endDate) {
      set({ currentStartDate: startDate, currentEndDate: endDate });
    }
    try {
      const params = new URLSearchParams();
      if (trainerId) params.append('trainerId', trainerId);
      if (date) params.append('date', date);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '200');
      const query = `?${params.toString()}`;
      const res = await get<PaginatedResponse<Availability>>(`/availability${query}`);
      set({ slots: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch availability', isLoading: false });
    }
  },

  fetchMonth: async (year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    await getState().fetchAvailability(undefined, undefined, startDate, endDate);
  },

  createAvailability: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const slot = await post<Availability>('/availability', data);
      // Re-fetch current month to get expanded virtual slots
      const { currentStartDate, currentEndDate, fetchAvailability } = getState();
      if (currentStartDate && currentEndDate) {
        await fetchAvailability(undefined, undefined, currentStartDate, currentEndDate);
      } else {
        const now = new Date();
        await getState().fetchMonth(now.getFullYear(), now.getMonth() + 1);
      }
      set({ isLoading: false });
      return slot;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create availability', isLoading: false });
      throw err;
    }
  },

  deleteAvailability: async (id) => {
    set({ error: null });
    try {
      await del(`/availability/${id}`);
      // Re-fetch to update expanded view (deleting a repeat rule removes all virtual slots)
      const { currentStartDate, currentEndDate, fetchAvailability, fetchMonth } = getState();
      if (currentStartDate && currentEndDate) {
        await fetchAvailability(undefined, undefined, currentStartDate, currentEndDate);
      } else {
        const now = new Date();
        await fetchMonth(now.getFullYear(), now.getMonth() + 1);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete availability' });
      throw err;
    }
  },

  bookSlot: async (availabilityId, clientId) => {
    set({ error: null });
    try {
      await post(`/availability/${availabilityId}/book`, { clientId });
      // Re-fetch current month
      const { currentStartDate, currentEndDate, fetchAvailability, fetchMonth } = getState();
      if (currentStartDate && currentEndDate) {
        await fetchAvailability(undefined, undefined, currentStartDate, currentEndDate);
      } else {
        const now = new Date();
        await fetchMonth(now.getFullYear(), now.getMonth() + 1);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to book slot' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
