'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** False during server render and hydration, true after. Gate localStorage reads on it. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Calls `onOutside` for clicks outside every given element while `active`. */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onOutside: () => void,
  active = true,
): void {
  const handler = useRef(onOutside);
  handler.current = onOutside;
  useEffect(() => {
    if (!active) return;
    const listener = (e: MouseEvent) => {
      const target = e.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      handler.current();
    };
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
    // refs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/** Runs `fn` on Escape while `active`. */
export function useEscape(fn: () => void, active = true): void {
  const handler = useRef(fn);
  handler.current = fn;
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler.current();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [active]);
}

/** Cycles through `items` every `ms`, returning the current one. */
export function useRotating<T>(items: readonly T[], ms: number, paused = false): T {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), ms);
    return () => window.clearInterval(id);
  }, [items.length, ms, paused]);
  return items[index % items.length];
}
