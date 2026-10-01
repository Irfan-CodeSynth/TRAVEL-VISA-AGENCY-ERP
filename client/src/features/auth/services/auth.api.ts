import api from '../../../services/api-client';

// The server wraps all responses as { success, data, message }
// Axios returns { data: { success, data, message } }
// So we need to unwrap twice: axios .data -> server .data

export const loginApi = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data; // { accessToken, refreshToken, user }
};

export const refreshApi = async (refreshToken: string) => {
  const res = await api.post('/auth/refresh', { refreshToken });
  return res.data.data;
};

export const logoutApi = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken });
  }
};

export const getMeApi = async () => {
  const res = await api.get('/auth/me');
  return res.data.data; // { id, email, firstName, lastName, permissions, roles, ... }
};

export const updateProfileApi = async (userData: any) => {
  const res = await api.patch('/auth/me', userData);
  return res.data.data;
};

export const changePasswordApi = async (passwordData: any) => {
  const res = await api.patch('/auth/change-password', passwordData);
  return res.data;
};
