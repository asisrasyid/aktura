import api from './api';

export type ArsipStatus = 'Aktif' | 'Diarsipkan' | 'Dipinjam';

export interface ArsipItem {
  id: string;
  aktaId?: string;
  nomorAkta: string;
  judulAkta: string;
  jenisAkta: string;
  tanggalAkta: string;
  tanggalArsip: string;
  lokasi?: string;
  status: ArsipStatus;
  keterangan?: string;
  createdAt: string;
}

export interface PeminjamanItem {
  id: string;
  arsipId: string;
  namaPeminjam: string;
  tanggalPinjam: string;
  tanggalKembali?: string;
  isKembali: boolean;
  keterangan?: string;
  createdAt: string;
}

export interface ArsipDetail extends ArsipItem {
  updatedAt?: string;
  peminjaman: PeminjamanItem[];
}

export interface PagedArsipResult {
  items: ArsipItem[];
  totalCount: number;
}

export interface CreateArsipRequest {
  aktaId?: string;
  nomorAkta: string;
  judulAkta: string;
  jenisAkta: string;
  tanggalAkta: string;
  tanggalArsip?: string;
  lokasi?: string;
  keterangan?: string;
}

export interface UpdateArsipRequest {
  tanggalArsip?: string;
  lokasi?: string;
  status?: string;
  keterangan?: string;
}

export interface PinjamRequest {
  namaPeminjam: string;
  tanggalPinjam: string;
  keterangan?: string;
}

export interface KembaliRequest {
  tanggalKembali?: string;
}

export const arsipService = {
  getAll(params: {
    search?: string;
    status?: string;
    tahun?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PagedArsipResult> {
    return api.get('/arsip', { params }).then(r => r.data);
  },

  getById(id: string): Promise<ArsipDetail> {
    return api.get(`/arsip/${id}`).then(r => r.data);
  },

  create(req: CreateArsipRequest): Promise<ArsipDetail> {
    return api.post('/arsip', req).then(r => r.data);
  },

  update(id: string, req: UpdateArsipRequest): Promise<void> {
    return api.put(`/arsip/${id}`, req).then(() => undefined);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/arsip/${id}`).then(() => undefined);
  },

  pinjam(id: string, req: PinjamRequest): Promise<PeminjamanItem> {
    return api.post(`/arsip/${id}/pinjam`, req).then(r => r.data);
  },

  kembali(id: string, req: KembaliRequest): Promise<void> {
    return api.post(`/arsip/${id}/kembali`, req).then(() => undefined);
  },
};
