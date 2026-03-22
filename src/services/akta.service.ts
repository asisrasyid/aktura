import api from './api';
import type { Akta, AktaListItem, CreateAktaPayload, PagedResult } from '../types';

export const aktaService = {
  getAll: (page: number, pageSize: number, search?: string, status?: string, jenisAkta?: string) =>
    api
      .get<PagedResult<AktaListItem>>('/akta', { params: { page, pageSize, search, status, jenisAkta } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Akta>(`/akta/${id}`).then((r) => r.data),

  create: (payload: CreateAktaPayload) =>
    api.post<Akta>('/akta', payload).then((r) => r.data),

  update: (id: string, payload: CreateAktaPayload) =>
    api.put<Akta>(`/akta/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/akta/${id}`),
};
