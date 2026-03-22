import api from './api';
import type {
  InvoiceListItem, InvoiceSummary, InvoiceDetail, PublicInvoice,
} from '../types';

export interface InvoiceFilter {
  status?: string;
  klienId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceItemForm {
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: string;
  urutan: number;
}

export interface CreateInvoicePayload {
  klienId: string;
  aktaId?: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  taxAmount: number;
  items: InvoiceItemForm[];
}

export interface RecordPaymentPayload {
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface VerifyPaymentPayload {
  paymentId: string;
  approved: boolean;
  notes?: string;
}

export interface PublicConfirmPayload {
  amount: number;
  notes?: string;
}

export const invoiceService = {
  async getList(filter: InvoiceFilter = {}): Promise<{ items: InvoiceListItem[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.status)   params.set('status', filter.status);
    if (filter.klienId)  params.set('klienId', filter.klienId);
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo)   params.set('dateTo', filter.dateTo);
    if (filter.search)   params.set('search', filter.search);
    if (filter.page)     params.set('page', String(filter.page));
    if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
    const { data } = await api.get(`/invoice?${params}`);
    return data;
  },

  async getSummary(): Promise<InvoiceSummary> {
    const { data } = await api.get('/invoice/summary');
    return data;
  },

  async getById(id: string): Promise<InvoiceDetail> {
    const { data } = await api.get(`/invoice/${id}`);
    return data;
  },

  async create(payload: CreateInvoicePayload): Promise<InvoiceDetail> {
    const { data } = await api.post('/invoice', payload);
    return data;
  },

  async update(id: string, payload: Omit<CreateInvoicePayload, 'klienId'>): Promise<InvoiceDetail> {
    const { data } = await api.put(`/invoice/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/invoice/${id}`);
  },

  async send(id: string): Promise<InvoiceDetail> {
    const { data } = await api.post(`/invoice/${id}/send`);
    return data;
  },

  async cancel(id: string): Promise<InvoiceDetail> {
    const { data } = await api.post(`/invoice/${id}/cancel`);
    return data;
  },

  async recordPayment(id: string, payload: RecordPaymentPayload): Promise<InvoiceDetail> {
    const { data } = await api.post(`/invoice/${id}/payment`, payload);
    return data;
  },

  async verifyPayment(id: string, payload: VerifyPaymentPayload): Promise<InvoiceDetail> {
    const { data } = await api.post(`/invoice/${id}/verify`, payload);
    return data;
  },

  // Public (no auth)
  async getPublic(token: string): Promise<PublicInvoice> {
    const { data } = await api.get(`/public/invoice/${token}`);
    return data;
  },

  async confirmPublicPayment(token: string, payload: PublicConfirmPayload): Promise<PublicInvoice> {
    const { data } = await api.post(`/public/invoice/${token}/confirm`, payload);
    return data;
  },
};
