import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// <ion-icon> is a web component loaded from the Ionicons CDN script in app/layout.tsx.
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { name?: string };
    }
  }
}
