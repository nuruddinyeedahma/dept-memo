import { http } from './http.js';

export const authApi = {
  login: (username, password, rememberMe) => http.post('/api/auth/login', { username, password, rememberMe }),
  logout: () => http.post('/api/auth/logout'),
  me: () => http.get('/api/auth/me'),
};
