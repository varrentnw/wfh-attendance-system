import ErrorMessages from '../components/ErrorMessages';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { login } from '../api/auth';
import { ApiError } from '../api/client';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessages, setErrorMessages] = useState<string[]>([]);

    async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessages([]);
        try {
            const loginResult = await login(username, password);
            console.log(loginResult);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessages(error.messages);
            } else {
                setErrorMessages(['Cannot reach the server. Please try again.']);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input id="username" value={username}  autoComplete="username" onChange={(event) => setUsername(event.target.value)} />
            
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />

           <ErrorMessages messages={errorMessages} />
           
           <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
           </button>
        </form>
    );
}

export default LoginPage;