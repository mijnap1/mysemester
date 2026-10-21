import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const DESCRIPTION =
  'Smartly track your university grades, plan courses, and stay on top of your semester. MySemester helps you visualize progress, organize assessments, and keep everything academic in one simple dashboard.';

export const metadata: Metadata = {
  metadataBase: new URL('https://mysemester.org'),
  title: 'MySemester',
  description: DESCRIPTION,
  icons: { icon: '/mysemesterlogo.png' },
  openGraph: {
    type: 'website',
    url: 'https://mysemester.org/',
    title: 'MySemester',
    description: DESCRIPTION,
    images: ['/mysemesterlogo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MySemester',
    description: DESCRIPTION,
    images: ['/mysemesterlogo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- app router root layout */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
        />
        <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js" async />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
