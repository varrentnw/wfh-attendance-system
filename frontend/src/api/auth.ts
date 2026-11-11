import { request } from './client';
import type { LoginResult } from '../types/api';

export function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  return request<LoginResult>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}
