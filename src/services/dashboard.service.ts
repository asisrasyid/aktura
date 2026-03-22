import api from './api';

export interface DashboardStats {
  totalAkta:                 number;
  aktaBulanIni:              number;
  aktaBulanLalu:             number;
  aktaSelesai:               number;
  totalKlien:                number;
  totalRegisterTahunIni:     number;
  approvalPending:           number;
  approvalDisetujuiBulanIni: number;
  totalArsip:                number;
  arsipDipinjam:             number;
  draftLama:                 number;
  aktaPerStatus:    { status: string; jumlah: number }[];
  registerPerJenis: { jenisBuku: string; total: number }[];
  aktaTerbaru: {
    id:          string;
    nomorAkta:   string;
    judul:       string;
    jenisAkta:   string;
    status:      string;
    tanggalAkta: string;
    jumlahPihak: number;
    createdAt:   string;
  }[];
  trenAkta: { tahun: number; bulan: number; jumlah: number }[];
}

export const dashboardService = {
  getStats(tahun?: number): Promise<DashboardStats> {
    return api.get('/dashboard/stats', { params: { tahun } }).then(r => r.data);
  },
};
