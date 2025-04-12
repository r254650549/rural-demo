import axios from 'axios';
import type { RouteRecordNormalized } from 'vue-router';
import { UserState } from '@/store/modules/user/types';
import { getBaseURL } from '@/utils/env';

const baseURL = getBaseURL();

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  code: number;
  msg: string;
  data: any | null;
  // Add other fields that might be returned from the API
}

export function login(data: LoginData) {
  return axios.post<LoginResponse>(`${getBaseURL()}/login`, data);
}

export function logout() {
  return axios.post<LoginResponse>('/api/user/logout');
}

export function getUserInfo() {
  return axios.post<UserState>(`${baseURL}/api/user/info`);
}

export function getMenuList() {
  return axios.post<RouteRecordNormalized[]>('/api/user/menu');
}
