import api from './api';

export interface SettingItem {
  key: string;
  value: string | null;
  updatedAt: string;
  updatedByName?: string;
}

export interface KantorSettings {
  nama: string;
  namaNotaris: string;
  alamat: string;
  telepon: string;
  nomorSK: string;
  wilayahKerja: string;
}

export interface ApprovalFlowSettings {
  approverRole: string;
  submitterRoles: string[];
  autoArsip: boolean;
}

export interface UserAdminItem {
  id: string;
  fullName: string;
  email: string;
  role: 'Admin' | 'Notaris' | 'Staff';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export const settingsService = {
  getAll(): Promise<SettingItem[]> {
    return api.get('/pengaturan').then(r => r.data);
  },

  getKantor(): Promise<KantorSettings> {
    return api.get('/pengaturan/kantor').then(r => r.data);
  },

  getApprovalFlow(): Promise<ApprovalFlowSettings> {
    return api.get('/pengaturan/approval-flow').then(r => r.data);
  },

  saveBulk(settings: { key: string; value: string | null }[]): Promise<void> {
    return api.post('/pengaturan/bulk', { settings }).then(() => undefined);
  },

  // User management
  getUsers(params?: { search?: string; role?: string }): Promise<UserAdminItem[]> {
    return api.get('/pengaturan/users', { params }).then(r => r.data);
  },

  updateRole(id: string, role: string): Promise<void> {
    return api.put(`/pengaturan/users/${id}/role`, { role }).then(() => undefined);
  },

  setActive(id: string, isActive: boolean): Promise<void> {
    return api.put(`/pengaturan/users/${id}/active`, { isActive }).then(() => undefined);
  },

  resetPassword(id: string, newPassword: string): Promise<void> {
    return api.post(`/pengaturan/users/${id}/reset-password`, { newPassword }).then(() => undefined);
  },

  deleteUser(id: string): Promise<void> {
    return api.delete(`/pengaturan/users/${id}`).then(() => undefined);
  },

  createUser(req: { fullName: string; email: string; password: string; role: string }): Promise<UserAdminItem> {
    return api.post('/pengaturan/users', req).then(r => r.data);
  },

  // Profile (current user)
  getProfile(): Promise<UserAdminItem> {
    return api.get('/pengaturan/profile').then(r => r.data);
  },

  updateProfile(fullName: string): Promise<void> {
    return api.put('/pengaturan/profile', { fullName }).then(() => undefined);
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return api.put('/pengaturan/change-password', { currentPassword, newPassword }).then(() => undefined);
  },
};
