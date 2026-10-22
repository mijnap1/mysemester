'use client';

import { useSyncExternalStore } from 'react';
import { KEYS, readString, writeString } from '@/lib/storage';

const LINES = [
  'Track your courses, grades and GPA in one place. UofT students can bring in their Quercus deadlines too.',
  'See what you need on the final before you sit down to write it.',
  'Weighted grades, letter averages and GPA, worked out as your marks come in.',
  'UofT students: every Quercus assignment and test, next to the grades it counts toward.',
  'Your GPA on your university’s scale, updated with every mark.',
  'Sort each semester into folders and keep your courses tidy.',
  'Know what’s due this week before it sneaks up on you.',
  'Courses and grades stay on your device. Sign in to have them everywhere.',
];

let chosen: number | null = null;

/** One line per page load, never the same as the previous visit's. */
function pickLine(): number {
  if (chosen !== null) return chosen;
  const saved = readString(KEYS.landingLine);
  const last = saved === null ? -1 : Number(saved);
  const options = LINES.map((_, i) => i).filter((i) => i !== last);
  chosen = options[Math.floor(Math.random() * options.length)];
  writeString(KEYS.landingLine, String(chosen));
  return chosen;
}

const subscribe = () => () => {};

/** The splash description. The server renders a blank line; the browser picks the text. */
export function LandingLine() {
  const index = useSyncExternalStore(subscribe, pickLine, () => null);
  return <p className="description">{index === null ? ' ' : LINES[index]}</p>;
}
