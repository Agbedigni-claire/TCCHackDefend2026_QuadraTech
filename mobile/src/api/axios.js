import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Injecte le token Bearer depuis le stockage sécurisé
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gère les 401 : tente un refresh, sinon redirige vers login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isTokenEndpoint =
      original.url?.includes('/api/token/') ||
      original.url?.includes('/api/token/refresh/');

    if (error.response?.status === 401 && !original._retry && !isTokenEndpoint) {
      original._retry = true;
      const refresh = await SecureStore.getItemAsync('refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
          await SecureStore.setItemAsync('access', data.access);
          if (data.refresh) await SecureStore.setItemAsync('refresh', data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          // refresh expiré → logout
        }
      }
      await Promise.all([
        SecureStore.deleteItemAsync('access'),
        SecureStore.deleteItemAsync('refresh'),
      ]);
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;
