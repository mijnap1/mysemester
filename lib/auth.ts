import { hasCompletedSetup, readAuth } from './semester';
import { KEYS, readJson, removeKey, writeJson, writeString } from './storage';
import { getSupabase } from './supabase';
import type { AuthState } from './types';

export function writeAuth(auth: AuthState): void {
  writeJson(KEYS.auth, auth);
}

/** Where a signed-in user should land. */
export function homePath(): string {
  return hasCompletedSetup() ? '/main/' : '/setup/';
}

export function isLoggedIn(): boolean {
  const auth = readAuth();
  return !!(auth.loggedIn && auth.username);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

async function resolveEmail(usernameOrEmail: string): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.rpc('get_email_by_username', { u: usernameOrEmail });
    if (typeof data === 'string' && data) return data;
    if (error) console.warn('Username lookup failed:', error.message);
  }
  const cached = readJson<AuthState>(KEYS.auth);
  if (cached?.username === usernameOrEmail && cached.email) return cached.email;
  return usernameOrEmail;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Sign in with a username or email. Accounts created before passwords stopped
 * being trimmed were saved with surrounding spaces removed, so a trimmed
 * retry keeps those working.
 */
export async function signIn(usernameOrEmail: string, password: string): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Login is unavailable. Please check your connection and refresh.' };

  const resolved = await resolveEmail(usernameOrEmail);
  const emails = unique([resolved, usernameOrEmail]);
  const passwords = unique([password, password.trim()]).filter(Boolean);

  for (const pw of passwords) {
    for (const email of emails) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error || !data.user) continue;

      const user = data.user;
      const userEmail = user.email ?? email;
      let profile = (await supabase.from('profiles').select('username, id').eq('id', user.id).maybeSingle()).data;
      if (!profile) {
        profile = (await supabase.from('profiles').select('username, id').eq('email', userEmail).maybeSingle()).data;
      }
      writeAuth({
        loggedIn: true,
        username: profile?.username || userEmail.split('@')[0],
        email: userEmail,
        id: profile?.id ?? null,
      });
      return { ok: true };
    }
  }
  return { ok: false, error: 'Invalid username, email, or password.' };
}

export async function sendPasswordReset(usernameOrEmail: string): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Password reset is unavailable. Please check your connection and refresh.' };
  const email = await resolveEmail(usernameOrEmail);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password/`,
  });
  return error ? { ok: false, error: error.message || 'Unable to send reset email.' } : { ok: true };
}

export async function signUp(username: string, email: string, password: string): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Sign up is unavailable. Please check your connection and refresh.' };

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
  if (error) return { ok: false, error: error.message || 'Sign up failed.' };

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, username, email });
    if (profileError) console.error('Profile insert error:', profileError.message);
  }

  writeAuth({ loggedIn: true, username, email });
  removeKey(KEYS.onboarding);
  writeString(KEYS.tutorialStart, '1');
  removeKey(KEYS.tutorialSeen);
  return { ok: true };
}

/** Ends the Supabase session too, not just the local "logged in" flag. */
export async function signOut(): Promise<void> {
  writeAuth({ loggedIn: false });
  try {
    await getSupabase()?.auth.signOut();
  } catch {
    // Already signed out remotely; the local flag is what gates the UI.
  }
}
