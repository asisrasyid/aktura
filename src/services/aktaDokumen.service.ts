import api from './api';

export interface AktaDokumenItem {
  id:             string;
  aktaId:         string;
  jenisDokumen:   string;
  namaAsli:       string;
  namaFile:       string;
  contentType:    string;
  fileSize:       number;
  uploadedById:   string;
  uploadedByName: string;
  uploadedAt:     string;
}

export const aktaDokumenService = {
  getByAkta: (aktaId: string) =>
    api.get<AktaDokumenItem[]>(`/akta/${aktaId}/dokumen`).then(r => r.data),

  upload: (aktaId: string, file: File, jenisDokumen: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('jenisDokumen', jenisDokumen);
    // Jangan set Content-Type manual — axios/browser harus set sendiri beserta boundary-nya
    return api.post<AktaDokumenItem>(`/akta/${aktaId}/dokumen`, form, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  // Fetch file sebagai Blob (include auth header via axios interceptor)
  getFileBlob: (id: string) =>
    api.get<Blob>(`/akta/dokumen/${id}/file`, { responseType: 'blob' }).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/akta/dokumen/${id}`).then(r => r.data),
};
