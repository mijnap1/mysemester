'use client';

import { useState, type FormEvent } from 'react';
import { PasswordInput } from '@/components/AuthBits';
import { Icon } from '@/components/Icon';
import { signUp } from '@/lib/auth';

type Field = 'username' | 'email' | 'password' | 'confirmPassword';

function FieldError({ message }: { message?: string }) {
  return message ? (
    <div className="error" style={{ display: 'block' }}>
      {message}
    </div>
  ) : (
    <div className="error" />
  );
}

export function SignupForm() {
  const [values, setValues] = useState<Record<Field, string>>({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const bind = (field: Field) => ({
    id: field,
    value: values[field],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [field]: e.target.value })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const username = values.username.trim();
    const email = values.email.trim();
    const { password, confirmPassword } = values;

    const next: Partial<Record<Field, string>> = {};
    if (!username) next.username = 'Please enter a username.';
    if (!email) next.email = 'Please enter your email.';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) next.email = 'Invalid email address.';
    if (!password) next.password = 'Please enter your password.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await signUp(username, email, password);
      if (!result.ok) {
        setErrors({ email: result.error });
        return;
      }
      setSuccess(true);
      window.setTimeout(() => window.location.assign('/setup/'), 900);
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Unexpected error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="signupForm" onSubmit={handleSubmit} noValidate>
      <input type="text" placeholder="Username" autoComplete="username" required {...bind('username')} />
      <FieldError message={errors.username} />
      <input type="email" placeholder="Email address" autoComplete="email" required {...bind('email')} />
      <FieldError message={errors.email} />
      <PasswordInput placeholder="Password" autoComplete="new-password" required {...bind('password')} />
      <FieldError message={errors.password} />
      <PasswordInput
        placeholder="Confirm Password"
        autoComplete="new-password"
        required
        toggleLabel="Toggle confirm password visibility"
        {...bind('confirmPassword')}
      />
      <FieldError message={errors.confirmPassword} />
      {success && (
        <div className="success" style={{ display: 'block' }}>
          Account created! Redirecting...
        </div>
      )}
      <button type="submit" disabled={busy}>
        Sign up
      </button>
      <p className="privacy-note">
        <Icon name="lock-closed-outline" /> We keep your account information private and protected.
      </p>
      <p>
        Already have an account? <a href="/login/">Log in</a>
      </p>
    </form>
  );
}
