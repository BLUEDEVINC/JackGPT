import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'auth_token';

const unauthorizedListeners = new Set();

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  unauthorizedListeners.forEach((listener) => listener());
}

export function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

export function apiFetch(path, { headers, ...options } = {}) {
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers: authHeaders(headers) });
}

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error || error?.message || fallback;
}

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...authHeaders() };
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearAuthToken();
    return Promise.reject(error);
  }
);

export default api;
