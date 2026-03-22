import api from './api';
import type { Klien, KlienPayload, PagedResult } from '../types';

export const klienService = {
  getAll: (page: number, pageSize: number, search?: string) =>
    api
      .get<PagedResult<Klien>>('/klien', { params: { page, pageSize, search } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Klien>(`/klien/${id}`).then((r) => r.data),

  create: (payload: KlienPayload) =>
    api.post<Klien>('/klien', payload).then((r) => r.data),

  update: (id: string, payload: KlienPayload) =>
    api.put<Klien>(`/klien/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/klien/${id}`),
};
