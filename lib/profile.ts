import { KEYS, readJson, readString, removeKey, writeJson, writeString } from './storage';
import type { AuthState, Onboarding, Profile, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  layout: 'compact',
  gpaFormat: '4.0',
  estimateTarget: '85',
};

/** "Jordan Lee" → "JL", "jordan" → "JO", "" → "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function readSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(readJson<Partial<Settings>>(KEYS.settings) ?? {}) };
}

export function writeSettings(settings: Settings): void {
  writeJson(KEYS.settings, settings);
  // The grade page reads this key directly.
  writeString(KEYS.estimateTarget, settings.estimateTarget);
}

export function clearSettings(): void {
  removeKey(KEYS.settings);
}

export function readOnboarding(): Onboarding {
  return readJson<Onboarding>(KEYS.onboarding) ?? {};
}

export function writeOnboarding(onboarding: Onboarding): void {
  writeJson(KEYS.onboarding, onboarding);
}

/** Saved profile for a signed-in user, or defaults built from their auth record. */
export function readProfile(auth: AuthState): Profile | null {
  if (!auth.loggedIn || !auth.username) return null;
  const saved = readJson<Partial<Profile>>(KEYS.profile(auth.username));
  const legacyPicture = readString(KEYS.legacyPfp(auth.username)) ?? '';
  return {
    picture: saved?.picture || legacyPicture,
    name: saved?.name ?? auth.username ?? '',
    nickname: saved?.nickname ?? '',
    email: saved?.email ?? auth.email ?? '',
    updatedAt: saved?.updatedAt,
  };
}

export function writeProfile(auth: AuthState, profile: Profile): void {
  if (auth.username) writeJson(KEYS.profile(auth.username), profile);
}

export function displayName(auth: AuthState, profile: Profile | null): string {
  return (
    profile?.nickname?.trim() ||
    profile?.name?.trim() ||
    auth.fullName?.trim() ||
    auth.username?.trim() ||
    'User'
  );
}

/** Only allow profile pictures we produced: image data URLs or https URLs. */
export function safePictureUrl(value: string | undefined): string {
  if (!value) return '';
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  return '';
}

export function avatarFallback(seed: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || 'U')}`;
}
