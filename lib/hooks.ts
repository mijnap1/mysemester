'use client';

import { useEffect, useEffectEvent, useState, type RefObject } from 'react';

/** Calls `onOutside` for clicks outside every given element while `active`. */
export function useClickOutside(refs: RefObject<HTMLElement | null>[], onOutside: () => void, active = true): void {
  const handle = useEffectEvent((target: Node) => {
    if (!refs.some((r) => r.current?.contains(target))) onOutside();
  });
  useEffect(() => {
    if (!active) return;
    const listener = (e: MouseEvent) => handle(e.target as Node);
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
  }, [active]);
}

/** Runs `fn` on Escape while `active`. */
export function useEscape(fn: () => void, active = true): void {
  const handle = useEffectEvent(fn);
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handle();
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
