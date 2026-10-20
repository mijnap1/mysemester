'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CardThemeToggle, PasswordInput } from '@/components/AuthBits';
import { homePath, isLoggedIn, sendPasswordReset, signIn } from '@/lib/auth';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) window.location.replace(homePath());
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setResetSent(false);
    const name = identifier.trim();
    if (!name || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await signIn(name, password);
      if (result.ok) {
        window.location.assign(homePath());
        return;
      }
      setError(result.error);
      setFailedAttempts((n) => n + 1);
    } catch (err) {
      console.error('Login error:', err);
      setError('Unexpected error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError('');
    setResetSent(false);
    const name = identifier.trim();
    if (!name) {
      setError('Enter your email or username to reset your password.');
      return;
    }
    try {
      const result = await sendPasswordReset(name);
      if (result.ok) setResetSent(true);
      else setError(result.error);
    } catch (err) {
      console.error('Reset error:', err);
      setError('Unexpected error. Please try again.');
    }
  }

  function toggleResetMode(next: boolean) {
    setResetMode(next);
    setError('');
    setResetSent(false);
  }

  return (
    <form className={resetMode ? 'card reset-mode' : 'card'} onSubmit={handleLogin} noValidate>
      <CardThemeToggle />
      <h1>Welcome Back</h1>
      <input
        type="text"
        id="username"
        placeholder={resetMode ? 'Email or username' : 'Username'}
        autoComplete="username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <PasswordInput
        id="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <div className="error" role="alert" style={{ display: 'block' }}>
          {error}
        </div>
      )}
      {resetSent && (
        <div className="success" style={{ display: 'block' }}>
          Check your email for a reset link.
        </div>
      )}
      {!resetMode && failedAttempts >= 2 && (
        <button type="button" className="link-btn" id="forgotPassword" style={{ display: 'inline-flex' }} onClick={() => toggleResetMode(true)}>
          Forgot password?
        </button>
      )}
      <button type="submit" id="loginBtn" disabled={busy}>
        {busy ? 'Signing in…' : 'Login'}
      </button>
      <button type="button" id="sendResetBtn" style={resetMode ? { display: 'inline-flex' } : undefined} onClick={handleReset}>
        Send reset link
      </button>
      <button type="button" className="link-btn" id="backToLogin" style={resetMode ? { display: 'inline-flex' } : undefined} onClick={() => toggleResetMode(false)}>
        Back to login
      </button>
      <div className="small">
        No account? <a href="/signup/">Sign up</a>
      </div>
    </form>
  );
}
