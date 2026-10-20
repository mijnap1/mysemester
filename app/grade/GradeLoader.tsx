'use client';

import dynamic from 'next/dynamic';

/** Grades come from this browser's saved data, so the tracker renders on the client only. */
export const GradeLoader = dynamic(() => import('./GradeTracker').then((m) => m.GradeTracker), { ssr: false });
