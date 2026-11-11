import ErrorMessages from '../components/ErrorMessages';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { toErrorMessages } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const { session, login } = useAuth();

  async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessages([]);
    try {
      await login(username, password);
    } catch (error) {
      setErrorMessages(toErrorMessages(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session !== null) {
    return <Navigate to="/" replace />;
  }
  return (
    <form onSubmit={handleLogin}>
      <label htmlFor="username">Username</label>
      <input
        id="username"
        value={username}
        autoComplete="username"
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <ErrorMessages messages={errorMessages} />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

export default LoginPage;
