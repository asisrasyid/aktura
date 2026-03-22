import api from './api';

export type ApprovalStatus = 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface ApprovalItem {
  approvalId:      string;
  aktaId:          string;
  nomorAkta:       string;
  judul:           string;
  jenisAkta:       string;
  tanggalAkta:     string;
  aktaStatus:      string;
  approvalStatus:  ApprovalStatus;
  requestedById:   string;
  requestedByName: string;
  reviewedById?:   string;
  reviewedByName?: string;
  catatan?:        string;
  createdAt:       string;
  reviewedAt?:     string;
  jumlahPihak:     number;
}

export interface ApprovalHistoryItem {
  approvalId:      string;
  aktaId:          string;
  status:          ApprovalStatus;
  requestedByName: string;
  reviewedByName?: string;
  catatan?:        string;
  createdAt:       string;
  reviewedAt?:     string;
}

export interface PagedApprovalResult {
  items:      ApprovalItem[];
  totalCount: number;
}

export const approvalService = {
  getInbox(params: {
    status?:   string;
    page?:     number;
    pageSize?: number;
  }): Promise<PagedApprovalResult> {
    return api.get('/approvals/inbox', { params }).then(r => r.data);
  },

  getPendingCount(): Promise<{ pendingCount: number }> {
    return api.get('/approvals/inbox/count').then(r => r.data);
  },

  getByAkta(aktaId: string): Promise<ApprovalHistoryItem[]> {
    return api.get(`/approvals/akta/${aktaId}`).then(r => r.data);
  },

  review(approvalId: string, action: 'Disetujui' | 'Ditolak', catatan?: string): Promise<ApprovalItem> {
    return api.post(`/approvals/${approvalId}/review`, { action, catatan }).then(r => r.data);
  },

  resubmit(aktaId: string, catatan?: string): Promise<void> {
    return api.post(`/approvals/akta/${aktaId}/resubmit`, { catatan }).then(() => undefined);
  },

  submit(aktaId: string, catatan?: string): Promise<void> {
    return api.post(`/approvals/akta/${aktaId}/submit`, { catatan }).then(() => undefined);
  },
};
