import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The anon key is public by design (row-level security protects the data).
// Override both with env vars to point at another project.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dqstskgvdiwdkonbapke.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3Rza2d2ZGl3ZGtvbmJhcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDI0NzYsImV4cCI6MjA3NTg3ODQ3Nn0.2iFEYtVQZjQOY8_sF4x0SvWIKk8L-jg4yzpXzLLFe60';

let client: SupabaseClient | null = null;

/** The browser's Supabase client. Null during server rendering. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** Signed-in Supabase user id from the locally stored session, without a network call. */
export async function getCloudUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}
