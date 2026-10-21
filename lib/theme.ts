'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { KEYS, readString, writeString } from './storage';
import type { ThemeSetting } from './types';

/**
 * Runs in <head> before first paint so pages never flash the wrong theme.
 * Also migrates the separate key the old login/signup pages used.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage,t=s.getItem('${KEYS.theme}');if(!t){var l=s.getItem('${KEYS.legacyTheme}');if(l==='dark'||l==='light'){t=l;s.setItem('${KEYS.theme}',l)}}if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})();`;

export function readThemeSetting(): ThemeSetting {
  const value = readString(KEYS.theme);
  return value === 'dark' || value === 'system' ? value : 'light';
}

function resolve(setting: ThemeSetting): 'light' | 'dark' {
  if (setting === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return setting;
}

function apply(setting: ThemeSetting): void {
  if (resolve(setting) === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setThemeSetting(setting: ThemeSetting): void {
  writeString(KEYS.theme, setting);
  apply(setting);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onMedia = () => {
    if (readThemeSetting() === 'system') apply('system');
    listener();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEYS.theme) {
      apply(readThemeSetting());
      listener();
    }
  };
  media.addEventListener('change', onMedia);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onMedia);
    window.removeEventListener('storage', onStorage);
  };
}

function snapshot(): string {
  const setting = readThemeSetting();
  return `${setting}:${resolve(setting)}`;
}

/** Current theme setting and what it resolves to, kept in sync across tabs. */
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'light:light');
  const [setting, resolved] = value.split(':') as [ThemeSetting, 'light' | 'dark'];
  const toggle = useCallback(() => {
    setThemeSetting(resolve(readThemeSetting()) === 'dark' ? 'light' : 'dark');
  }, []);
  return { setting, resolved, isDark: resolved === 'dark', setSetting: setThemeSetting, toggle };
}
