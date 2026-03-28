import { create } from 'zustand';
import { get, post, put, del } from '../services/api';
import type { Client, PaginatedResponse } from '../types';

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;

  fetchClients: (page?: number) => Promise<void>;
  fetchClient: (id: string) => Promise<void>;
  createClient: (data: CreateClientInput) => Promise<Client>;
  updateClient: (id: string, data: Partial<CreateClientInput>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  clearError: () => void;
}

interface CreateClientInput {
  userId: string;
  trainerId?: string;
  workoutPlanId?: string;
  totalSessions: number;
  phone?: string;
  whatsapp?: string;
}

export const useClientStore = create<ClientState>((set, getState) => ({
  clients: [],
  selectedClient: null,
  total: 0,
  page: 1,
  isLoading: false,
  error: null,

  fetchClients: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await get<PaginatedResponse<Client>>(
        `/clients?page=${page}&limit=20`,
      );
      set({ clients: res.data, total: res.total, page: res.page, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch clients', isLoading: false });
    }
  },

  fetchClient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const client = await get<Client>(`/clients/${id}`);
      set({ selectedClient: client, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch client', isLoading: false });
    }
  },

  createClient: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const client = await post<Client>('/clients', data);
      set((s) => ({ clients: [client, ...s.clients], isLoading: false }));
      return client;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create client', isLoading: false });
      throw err;
    }
  },

  updateClient: async (id, data) => {
    set({ error: null });
    try {
      const updated = await put<Client>(`/clients/${id}`, data);
      set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? updated : c)),
        selectedClient: s.selectedClient?.id === id ? updated : s.selectedClient,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update client' });
      throw err;
    }
  },

  deleteClient: async (id) => {
    set({ error: null });
    try {
      await del(`/clients/${id}`);
      set((s) => ({
        clients: s.clients.filter((c) => c.id !== id),
        selectedClient: s.selectedClient?.id === id ? null : s.selectedClient,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete client' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
