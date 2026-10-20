'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';

/**
 * Supabase signs the user in from the link in the reset email (tokens in the
 * URL hash, or a ?code= for PKCE). The client usually handles that itself on
 * load; this falls back to doing it by hand.
 */
async function establishResetSession(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return true;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const code = new URLSearchParams(window.location.search).get('code');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return !error;
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }
  return false;
}

export function ResetForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    if (!getSupabase()) {
      setError('Password reset is unavailable. Please check your connection and refresh.');
      setLinkInvalid(true);
      return;
    }
    establishResetSession()
      .then((ok) => {
        if (!ok) {
          setError('Reset link is invalid or expired. Request a new reset email.');
          setLinkInvalid(true);
        }
      })
      .catch((err) => {
        console.error('Session init error:', err);
        setError('Reset link is invalid or expired. Request a new reset email.');
        setLinkInvalid(true);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!password || !confirm) return setError('Please fill in both fields.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const { error: updateError } = await getSupabase()!.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Unable to update password.');
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirm('');
      window.setTimeout(() => window.location.assign('/login/'), 1200);
    } catch (err) {
      console.error('Reset error:', err);
      setError('Unexpected error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>Reset Password</h1>
      <p className="sub">Enter a new password for your account.</p>
      <input
        type="password"
        id="newPassword"
        placeholder="New password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        id="confirmPassword"
        placeholder="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <div className="error" role="alert" style={{ display: 'block' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="success" style={{ display: 'block' }}>
          Password updated. You can now log in.
        </div>
      )}
      <button type="submit" id="resetBtn" disabled={busy || linkInvalid}>
        {busy ? 'Updating…' : 'Update Password'}
      </button>
      <div className="small">
        <a href="/login/">Back to login</a>
      </div>
    </form>
  );
}
