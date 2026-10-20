/**
 * localStorage access. Every key the app uses is listed here, and every read
 * and write is guarded: storage can be missing or throw (private mode,
 * blocked site data), and nothing should crash because of it.
 *
 * Key names are unchanged from the original static site so existing users
 * keep their data.
 */
export const KEYS = {
  auth: 'uoft_auth_v1',
  onboarding: 'uoft_onboarding_v1',
  settings: 'uoft_settings_v1',
  theme: 'uoft_theme',
  /** Old login/signup pages kept their own theme here. Read once for migration. */
  legacyTheme: 'theme',
  estimateTarget: 'uoft_estimate_target',
  semesterBase: 'uoft-grade-lite-v5',
  tutorialStart: 'ms_tutorial_start',
  tutorialSeen: 'ms_tutorial_seen',
  professorPicksHintSeen: 'mysemester_professor_picks_hint_seen',
  profile: (username: string) => `mysemester_user_${username}`,
  legacyPfp: (username: string) => `uoft_user_${username}_pfp`,
  /** Pre-v6 assessments lived outside the semester state, keyed by course code. */
  legacyGrades: (username: string, code: string) => `grades_${username}_${code}_v3`,
} as const;

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked; the in-memory state still works this session.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}

export function allKeys(): string[] {
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}
