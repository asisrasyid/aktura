import api from './api';
import type { LoginPayload, LoginResponse, RegisterPayload } from '../types';

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    api.post<LoginResponse>('/auth/register', payload).then((r) => r.data),

  googleLogin: (idToken: string) =>
    api.post<LoginResponse>('/auth/google', { idToken }).then((r) => r.data),
};
