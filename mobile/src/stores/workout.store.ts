import { create } from 'zustand';
import { get, post, put, del } from '../services/api';
import type { WorkoutPlan, PaginatedResponse } from '../types';

interface WorkoutState {
  plans: WorkoutPlan[];
  selectedPlan: WorkoutPlan | null;
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;

  fetchPlans: (page?: number) => Promise<void>;
  fetchPlan: (id: string) => Promise<void>;
  createPlan: (data: CreatePlanInput) => Promise<WorkoutPlan>;
  updatePlan: (id: string, data: Partial<CreatePlanInput>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addDay: (planId: string, dayNumber: number, muscleGroup: string) => Promise<void>;
  deleteDay: (dayId: string) => Promise<void>;
  addExercise: (dayId: string, exercise: ExerciseInput) => Promise<void>;
  updateExercise: (exerciseId: string, data: Partial<ExerciseInput>) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
  clearSelected: () => void;
  clearError: () => void;
}

interface CreatePlanInput {
  name: string;
  description?: string;
  days: number;
  isPrebuilt?: boolean;
  workoutDays?: {
    dayNumber: number;
    muscleGroup: string;
    exercises?: ExerciseInput[];
  }[];
}

interface ExerciseInput {
  name: string;
  sets: number;
  reps?: number;
  duration?: string;
  order: number;
}

export const useWorkoutStore = create<WorkoutState>((set, getState) => ({
  plans: [],
  selectedPlan: null,
  total: 0,
  page: 1,
  isLoading: false,
  error: null,

  fetchPlans: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await get<PaginatedResponse<WorkoutPlan>>(
        `/workouts?page=${page}&limit=20`,
      );
      set({ plans: res.data, total: res.total, page: res.page, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch plans', isLoading: false });
    }
  },

  fetchPlan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await get<WorkoutPlan>(`/workouts/${id}`);
      set({ selectedPlan: plan, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch plan', isLoading: false });
    }
  },

  createPlan: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await post<WorkoutPlan>('/workouts', data);
      set((s) => ({ plans: [plan, ...s.plans], isLoading: false }));
      return plan;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create plan', isLoading: false });
      throw err;
    }
  },

  updatePlan: async (id, data) => {
    set({ error: null });
    try {
      const updated = await put<WorkoutPlan>(`/workouts/${id}`, data);
      set((s) => ({
        plans: s.plans.map((p) => (p.id === id ? updated : p)),
        selectedPlan: s.selectedPlan?.id === id ? updated : s.selectedPlan,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update plan' });
      throw err;
    }
  },

  deletePlan: async (id) => {
    set({ error: null });
    try {
      await del(`/workouts/${id}`);
      set((s) => ({
        plans: s.plans.filter((p) => p.id !== id),
        selectedPlan: s.selectedPlan?.id === id ? null : s.selectedPlan,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete plan' });
      throw err;
    }
  },

  addDay: async (planId, dayNumber, muscleGroup) => {
    try {
      await post(`/workouts/${planId}/days`, { dayNumber, muscleGroup });
      await getState().fetchPlan(planId);
    } catch (err: any) {
      set({ error: err.message || 'Failed to add day' });
      throw err;
    }
  },

  deleteDay: async (dayId) => {
    try {
      await del(`/workouts/days/${dayId}`);
      const plan = getState().selectedPlan;
      if (plan) await getState().fetchPlan(plan.id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete day' });
      throw err;
    }
  },

  addExercise: async (dayId, exercise) => {
    try {
      await post(`/workouts/days/${dayId}/exercises`, exercise);
      const plan = getState().selectedPlan;
      if (plan) await getState().fetchPlan(plan.id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to add exercise' });
      throw err;
    }
  },

  updateExercise: async (exerciseId, data) => {
    try {
      await put(`/workouts/exercises/${exerciseId}`, data);
      const plan = getState().selectedPlan;
      if (plan) await getState().fetchPlan(plan.id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to update exercise' });
      throw err;
    }
  },

  deleteExercise: async (exerciseId) => {
    try {
      await del(`/workouts/exercises/${exerciseId}`);
      const plan = getState().selectedPlan;
      if (plan) await getState().fetchPlan(plan.id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete exercise' });
      throw err;
    }
  },

  clearSelected: () => set({ selectedPlan: null }),
  clearError: () => set({ error: null }),
}));
