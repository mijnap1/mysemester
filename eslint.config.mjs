import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Pages navigate with full loads on purpose: each route ships its own
      // global stylesheet (carried over from the static site), and a full
      // load keeps one page's styles from leaking into the next.
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts']),
]);
