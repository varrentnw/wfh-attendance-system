import type { Role } from '../types/api';

export type Session = {
  accessToken: string;
  employeeId: number;
  role: Role;
};

const STORAGE_KEY = 'wfh.session';

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return null;
  }
  try {
    return JSON.parse(stored) as Session;
  } catch {
    // A value we can't parse is useless; remove it so the user simply logs in again.
    clearSession();
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
