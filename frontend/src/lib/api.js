import axios from 'axios';
import { getStoredItem } from './storage';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const AUTH_TOKEN_KEY = 'auth_token';

export const readStoredToken = () => getStoredItem(AUTH_TOKEN_KEY);

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AUTH_EXPIRED_EVENT = 'auth:expired';

export function onAuthExpired(listener) {
  window.addEventListener(AUTH_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Turns an axios/fetch/thrown error into a message that is safe to show a user. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const data = error.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return data.error;

  if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';

  return error.message || fallback;
}

export default api;
