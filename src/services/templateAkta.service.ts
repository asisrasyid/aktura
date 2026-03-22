import api from './api';
import type { PagedResult, TemplateAktaListItem, TemplateAkta, CreateTemplateAktaPayload } from '../types';

const BASE = '/template-akta';

const getToken = () => localStorage.getItem('token');

/** Trigger download blob sebagai file */
export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const templateAktaService = {
  getAll: (page = 1, pageSize = 10, search?: string, jenisAkta?: string) => {
    const params: Record<string, unknown> = { page, pageSize };
    if (search)    params.search    = search;
    if (jenisAkta) params.jenisAkta = jenisAkta;
    return api.get<PagedResult<TemplateAktaListItem>>(BASE, { params });
  },

  getById: (id: string) =>
    api.get<TemplateAkta>(`${BASE}/${id}`),

  create: (payload: CreateTemplateAktaPayload) =>
    api.post<TemplateAkta>(BASE, payload),

  update: (id: string, payload: CreateTemplateAktaPayload) =>
    api.put<TemplateAkta>(`${BASE}/${id}`, payload),

  delete: (id: string) =>
    api.delete(`${BASE}/${id}`),

  // ---- Single generate (text preview) ----
  generate: (id: string, values: Record<string, string>) =>
    api.post<{ dokumen: string }>(`${BASE}/${id}/generate`, { values }),

  // ---- Generate file (format-preserving: docx | pdf) ----
  generateFile: async (
    id: string,
    values: Record<string, string>,
    format: 'docx' | 'pdf',
  ): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`/api/template-akta/${id}/generate-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ values, format }),
    });

    if (!res.ok) {
      // Coba parse pesan error dari backend
      const errBody = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(errBody.message ?? res.statusText), {
        status: res.status,
        response: { data: errBody },
      });
    }

    return res.blob();
  },

  // ---- Parse PDF (text-only) ----
  parsePdf: async (file: File): Promise<{ data: { text: string } }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/template-akta/parse-pdf', {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw Object.assign(new Error(err.message), { response: { data: err } });
    }
    const data = await res.json() as { text: string };
    return { data };
  },

  // ---- Parse DOCX (text + base64) ----
  parseDocx: async (file: File): Promise<{ data: { text: string; fileBase64: string; tipeFile: string } }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/template-akta/parse-docx', {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw Object.assign(new Error(err.message), { response: { data: err } });
    }
    const data = await res.json() as { text: string; fileBase64: string; tipeFile: string };
    return { data };
  },

  // ---- Excel template download ----
  downloadExcelTemplate: (id: string) =>
    api.get<Blob>(`${BASE}/${id}/excel-template`, { responseType: 'blob' }),

  // ---- Bulk generate from JSON rows ----
  bulkGenerate: async (
    id: string,
    rows: Record<string, string>[],
    format: 'docx' | 'pdf' = 'docx',
  ): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`/api/template-akta/${id}/bulk-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rows, format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },

  // ---- Generate Word/PDF via base template (Director's base .docx) ----
  generateWord: async (id: string, values: Record<string, string>, format: 'docx' | 'pdf' = 'docx'): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`/api/template-akta/${id}/generate-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ values, format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },

  // ---- Bulk generate from Excel file (format-preserving lama) ----
  bulkGenerateFromExcel: async (
    id: string,
    file: File,
    format: 'docx' | 'pdf' = 'docx',
  ): Promise<Blob> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/template-akta/${id}/bulk-generate-excel?format=${format}`, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },

  // ---- Bulk generate Word via base template (flow baru) ----
  bulkGenerateWord: async (
    id: string,
    rows: Record<string, string>[],
  ): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`/api/template-akta/${id}/bulk-generate-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },

  // ---- Generate DOCX/PDF dari plain text (KonsepDokumen download) ----
  generateFromText: async (text: string, format: 'docx' | 'pdf' = 'docx'): Promise<Blob> => {
    const token = getToken();
    const res = await fetch('/api/template-akta/generate-from-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },

  // ---- Bulk generate Word dari Excel via base template (flow baru) ----
  bulkGenerateWordFromExcel: async (id: string, file: File): Promise<Blob> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/template-akta/${id}/bulk-generate-word-excel`, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw Object.assign(new Error(err.message ?? res.statusText), { response: { data: err } });
    }
    return res.blob();
  },
};
