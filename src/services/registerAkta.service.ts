import api from './api';

export type JenisBuku =
  | 'REPERTORIUM'
  | 'AKTA'
  | 'LEGALITAS'
  | 'WAARMERKING'
  | 'PROTES'
  | 'WASIAT';

export interface RegisterAktaListItem {
  id: string;
  nomorDisplay: string;
  nomorUrut: number;
  tahun: number;
  tanggal: string;
  jenisBuku: JenisBuku;
  judulSingkat: string;
  paraPihak?: string;
  statusLaporan?: string;
  keterangan?: string;
  detailJson?: string;
  tanggalLaporan?: string;
  createdAt: string;
}

export interface RegisterAktaDetail extends RegisterAktaListItem {
  detailJson?: string;
  aktaId?: string;
  tanggalLaporan?: string;
  updatedAt?: string;
}

export interface RegisterSummary {
  jenisBuku: string;
  total: number;
}

export interface CreateRegisterAktaRequest {
  tanggal: string;
  jenisBuku: JenisBuku;
  judulSingkat: string;
  paraPihak?: string;
  detail?: Record<string, string>;
  aktaId?: string;
  keterangan?: string;
}

export interface UpdateRegisterAktaRequest {
  tanggal: string;
  judulSingkat: string;
  paraPihak?: string;
  detail?: Record<string, string>;
  statusLaporan?: string;
  tanggalLaporan?: string;
  keterangan?: string;
}

export interface PagedRegisterResult {
  items: RegisterAktaListItem[];
  totalCount: number;
}

export const registerAktaService = {
  getAll(params: {
    jenisBuku?: string;
    tahun?: number;
    bulan?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedRegisterResult> {
    return api.get('/register-akta', { params }).then((r) => r.data);
  },

  getSummary(tahun?: number): Promise<RegisterSummary[]> {
    return api.get('/register-akta/summary', { params: { tahun } }).then((r) => r.data);
  },

  getById(id: string): Promise<RegisterAktaDetail> {
    return api.get(`/register-akta/${id}`).then((r) => r.data);
  },

  create(req: CreateRegisterAktaRequest): Promise<RegisterAktaDetail> {
    return api.post('/register-akta', req).then((r) => r.data);
  },

  update(id: string, req: UpdateRegisterAktaRequest): Promise<void> {
    return api.put(`/register-akta/${id}`, req).then(() => undefined);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/register-akta/${id}`).then(() => undefined);
  },

  getBuku(jenisBuku: JenisBuku, tahun: number): Promise<RegisterAktaListItem[]> {
    return api.get('/register-akta/buku', { params: { jenisBuku, tahun } }).then(r => r.data);
  },
};
