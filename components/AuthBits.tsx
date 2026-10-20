'use client';

import { useState, type ComponentProps } from 'react';
import { useTheme } from '@/lib/theme';
import { Icon } from './Icon';

/** The round theme button in the corner of the login and signup cards. */
export function CardThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button type="button" className="theme-toggle" aria-label="Toggle dark/light mode" title="Toggle dark/light mode" onClick={toggle}>
      <Icon name={isDark ? 'sunny-outline' : 'moon-outline'} />
    </button>
  );
}

/** Password field with a show/hide eye button. */
export function PasswordInput({ toggleLabel = 'Toggle password visibility', ...props }: ComponentProps<'input'> & { toggleLabel?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrapper">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="toggle-password"
        aria-label={toggleLabel}
        aria-pressed={visible}
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? 'eye-outline' : 'eye-off-outline'} />
      </button>
    </div>
  );
}
