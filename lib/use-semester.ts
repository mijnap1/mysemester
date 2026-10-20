'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectCapabilities,
  fetchRemote,
  markSynced,
  mergeRemote,
  pushChanges,
  type CloudCapabilities,
} from './cloud-sync';
import { loadState, readAuth, saveState, stateKey } from './semester';
import { getCloudUserId, getSupabase } from './supabase';
import type { AuthState, SemesterState } from './types';

const SYNC_DEBOUNCE_MS = 600;

export interface SemesterStore {
  auth: AuthState;
  state: SemesterState;
  /** Apply a change, save it locally, and schedule a cloud sync. */
  update: (fn: (state: SemesterState) => SemesterState) => void;
  /** Apply a view-only change (e.g. which folder is open): saved locally, never synced. */
  updateLocal: (fn: (state: SemesterState) => SemesterState) => void;
  /** True while the first cloud load after opening the page is running. */
  initialSyncing: boolean;
  /** Set when the last sync attempt failed; cleared by the next success. */
  syncError: string | null;
}

/**
 * The semester data for the signed-in user (or guest), kept in localStorage
 * and, when signed in to Supabase, synced to the cloud.
 *
 * Reads localStorage while initializing, so only use it in components that
 * render on the client only (see the pages' `ssr: false` loaders).
 */
export function useSemester(): SemesterStore {
  const [initial] = useState(() => {
    const auth = readAuth();
    return { auth, state: loadState(auth) };
  });
  const auth = initial.auth;
  const [state, setState] = useState<SemesterState>(initial.state);
  const [initialSyncing, setInitialSyncing] = useState(() => auth.loggedIn && !!getSupabase());
  const [syncError, setSyncError] = useState<string | null>(null);

  const stateRef = useRef<SemesterState>(initial.state);
  const capsRef = useRef<CloudCapabilities | null>(null);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const rerunRef = useRef(false);

  const commit = useCallback(
    (next: SemesterState) => {
      stateRef.current = next;
      setState(next);
      saveState(auth, next);
    },
    [auth],
  );

  const syncOnce = useCallback(async (): Promise<void> => {
    const client = getSupabase();
    if (!client) return;
    const userId = await getCloudUserId();
    if (!userId) return;
    capsRef.current ??= await detectCapabilities(client);
    const caps = capsRef.current;
    const remote = await fetchRemote(client, userId, caps);
    const result = mergeRemote(stateRef.current, remote);
    commit(result.state);
    await pushChanges(client, userId, result, caps);
    commit(markSynced(stateRef.current, result, caps.folders));
  }, [commit]);

  /** Sync now; if called while a sync is running, run once more afterwards. */
  const runSync = useCallback(async (): Promise<void> => {
    if (!auth.loggedIn) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    try {
      do {
        rerunRef.current = false;
        try {
          await syncOnce();
          setSyncError(null);
        } catch (err) {
          console.warn('Cloud sync failed:', err);
          setSyncError("Couldn't sync to the cloud. Your changes are saved on this device and will sync later.");
          rerunRef.current = false;
        }
      } while (rerunRef.current);
    } finally {
      runningRef.current = false;
    }
  }, [auth.loggedIn, syncOnce]);

  const queueSync = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runSync();
    }, SYNC_DEBOUNCE_MS);
  }, [runSync]);

  const update = useCallback(
    (fn: (s: SemesterState) => SemesterState) => {
      const next = fn(stateRef.current);
      if (next === stateRef.current) return;
      commit(next);
      queueSync();
    },
    [commit, queueSync],
  );

  const updateLocal = useCallback(
    (fn: (s: SemesterState) => SemesterState) => {
      const next = fn(stateRef.current);
      if (next !== stateRef.current) commit(next);
    },
    [commit],
  );

  useEffect(() => {
    // Persist the normalized (possibly migrated) copy straight away.
    saveState(auth, stateRef.current);
    void runSync().finally(() => setInitialSyncing(false));

    // Another tab (or the grade page in another tab) saved: pick up its copy.
    const onStorage = (e: StorageEvent) => {
      if (e.key === stateKey(auth)) {
        const next = loadState(auth);
        stateRef.current = next;
        setState(next);
      }
    };
    // Retry anything that failed while offline.
    const onOnline = () => void runSync();
    // Leaving the page (e.g. opening a course) right after an edit: send it now.
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void runSync();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHide);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [auth, runSync]);

  return { auth, state, update, updateLocal, initialSyncing, syncError };
}
