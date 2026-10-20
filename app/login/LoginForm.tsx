'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { homePath, isLoggedIn, sendPasswordReset, signIn } from '@/lib/auth';

type Notice = { tone: 'error' | 'success'; text: string } | null;

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) window.location.replace(homePath());
  }, []);

  function switchMode(next: boolean) {
    setResetMode(next);
    setNotice(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const name = identifier.trim();

    if (resetMode) {
      if (!name) return setNotice({ tone: 'error', text: 'Enter your email or username to reset your password.' });
      setBusy(true);
      try {
        const result = await sendPasswordReset(name);
        setNotice(result.ok ? { tone: 'success', text: 'Check your email for a reset link.' } : { tone: 'error', text: result.error });
      } catch (err) {
        console.error('Reset error:', err);
        setNotice({ tone: 'error', text: 'Unexpected error. Please try again.' });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!name || !password) return setNotice({ tone: 'error', text: 'Please enter both your username and password.' });
    setBusy(true);
    try {
      const result = await signIn(name, password);
      if (result.ok) {
        window.location.assign(homePath());
        return;
      }
      setNotice({ tone: 'error', text: result.error });
    } catch (err) {
      console.error('Login error:', err);
      setNotice({ tone: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lg-form" onSubmit={handleSubmit} noValidate>
      <div className="lg-form-head">
        <h1>{resetMode ? 'Reset your password' : 'Welcome back'}</h1>
        <p>{resetMode ? 'Enter your username or email and we’ll send you a reset link.' : 'Sign in to pick up where you left off.'}</p>
      </div>

      <div className="lg-field">
        <label htmlFor="username">Username or email</label>
        <div className="lg-input">
          <Icon name="person-outline" />
          <input
            id="username"
            type="text"
            placeholder="you@mail.utoronto.ca"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
      </div>

      {!resetMode && (
        <div className="lg-field">
          <div className="lg-label-row">
            <label htmlFor="password">Password</label>
            <button type="button" className="lg-link" onClick={() => switchMode(true)}>
              Forgot?
            </button>
          </div>
          <div className="lg-input">
            <Icon name="lock-closed-outline" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="lg-eye"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              <Icon name={showPassword ? 'eye-outline' : 'eye-off-outline'} />
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className={`lg-notice is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <Icon name={notice.tone === 'error' ? 'alert-circle-outline' : 'mail-unread-outline'} />
          <span>{notice.text}</span>
        </div>
      )}

      <button type="submit" className="lg-submit" disabled={busy}>
        {busy ? (resetMode ? 'Sending…' : 'Signing in…') : resetMode ? 'Send reset link' : 'Sign in'}
        {!busy && <Icon name="arrow-forward-outline" />}
      </button>

      <p className="lg-alt">
        {resetMode ? (
          <button type="button" className="lg-link" onClick={() => switchMode(false)}>
            <Icon name="arrow-back-outline" /> Back to sign in
          </button>
        ) : (
          <>
            New to MySemester? <a href="/signup/">Create an account</a>
          </>
        )}
      </p>
    </form>
  );
}
