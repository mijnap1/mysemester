'use client';

import dynamic from 'next/dynamic';

/** The dashboard is built entirely from this browser's saved data, so it renders on the client only. */
export const DashboardLoader = dynamic(() => import('./Dashboard').then((m) => m.Dashboard), { ssr: false });
