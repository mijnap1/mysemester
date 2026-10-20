'use client';

import { useEffect } from 'react';
import { isLoggedIn } from '@/lib/auth';

/** Shows the splash for two seconds, then sends the visitor to their dashboard or login. */
export function Splash() {
  useEffect(() => {
    const next = isLoggedIn() ? '/main/' : '/login/';
    const id = window.setTimeout(() => window.location.assign(next), 2000);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
