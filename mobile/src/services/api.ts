import axios, { AxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { Config } from '../utils/config';

const TOKEN_SERVICE = 'wellvantage_auth';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

const DEV_API = Config.API_BASE_URL || 'http://192.168.1.39:3000/api';
const PROD_API = Config.API_PROD_URL || 'https://api.wellvantage.com/api';

const api = axios.create({
  baseURL: __DEV__ ? DEV_API : PROD_API,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword({
    service: TOKEN_SERVICE,
  });
  if (credentials) {
    config.headers.Authorization = `Bearer ${credentials.password}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
      } catch {
        // Keychain unavailable — safe to ignore
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function storeToken(token: string) {
  await Keychain.setGenericPassword('token', token, {
    service: TOKEN_SERVICE,
  });
}

export async function getToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: TOKEN_SERVICE,
  });
  return credentials ? credentials.password : null;
}

export async function clearToken() {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}

export async function get<T>(url: string, config?: AxiosRequestConfig) {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await api.post<T>(url, data, config);
  return res.data;
}

export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await api.put<T>(url, data, config);
  return res.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig) {
  const res = await api.delete<T>(url, config);
  return res.data;
}

export default api;
