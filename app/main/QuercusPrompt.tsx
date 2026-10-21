'use client';

import { Icon } from '@/components/Icon';

interface QuercusPromptProps {
  open: boolean;
  onConnect: () => void;
  onDismiss: () => void;
}

/**
 * A card that slides up into the corner to invite UofT students to connect
 * Quercus. It floats over the page, so the dashboard layout never changes.
 */
export function QuercusPrompt({ open, onConnect, onDismiss }: QuercusPromptProps) {
  return (
    <aside className={open ? 'quercus-prompt show' : 'quercus-prompt'} aria-hidden={!open} aria-labelledby="quercus-prompt-title">
      <button type="button" className="quercus-prompt-close" aria-label="Dismiss" tabIndex={open ? 0 : -1} onClick={onDismiss}>
        <Icon name="close-outline" />
      </button>
      <div className="quercus-prompt-icon">
        <Icon name="calendar-outline" />
      </div>
      <h3 id="quercus-prompt-title">Connect Quercus</h3>
      <p>See every assignment, quiz and test deadline from your courses right on your dashboard.</p>
      <div className="quercus-prompt-actions">
        <button type="button" className="quercus-prompt-primary" tabIndex={open ? 0 : -1} onClick={onConnect}>
          Connect
        </button>
        <button type="button" className="quercus-prompt-secondary" tabIndex={open ? 0 : -1} onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
