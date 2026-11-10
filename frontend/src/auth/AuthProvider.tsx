import { useState } from 'react';
import type { ReactNode } from 'react';
import { login as loginRequest } from '../api/auth';
import { AuthContext } from './AuthContext';
import { clearSession, getSession, saveSession } from './session';
import type { Session } from './session';

type AuthProviderProps = {
  children: ReactNode;
};

function AuthProvider({ children }: AuthProviderProps) {
  // Passing the function itself (not calling it) makes React read storage once, on the first render only.
  const [session, setSession] = useState<Session | null>(getSession);

  async function login(username: string, password: string): Promise<void> {
    const result = await loginRequest(username, password);
    const newSession: Session = {
      accessToken: result.accessToken,
      employeeId: result.employeeId,
      role: result.role,
    };
    saveSession(newSession);
    setSession(newSession);
  }

  function logout(): void {
    clearSession();
    setSession(null);
  }

  return <AuthContext value={{ session, login, logout }}>{children}</AuthContext>;
}

export default AuthProvider;