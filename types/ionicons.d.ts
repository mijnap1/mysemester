import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// <ion-icon> is a web component loaded from the Ionicons CDN script in app/layout.tsx.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { name?: string };
    }
  }
}
