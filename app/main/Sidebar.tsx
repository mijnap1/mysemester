'use client';

import { Icon } from '@/components/Icon';
import { useRotating } from '@/lib/hooks';
import type { Onboarding } from '@/lib/types';

const TIPS = [
  'Right-click (or long-press) a course card to edit, duplicate, move it out of a folder, and more.',
  'Double-click an assessment name or weight to edit it.',
  'Use the target estimate to see what you need on remaining work.',
  'Switch between compact and spacious layouts in Settings.',
];

interface SidebarProps {
  open: boolean;
  onboarding: Onboarding;
  onNewFolder: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export function Sidebar({ open, onboarding, onNewFolder, onOpenSettings, onOpenAbout }: SidebarProps) {
  const tip = useRotating(TIPS, 6000);
  const isUofT = onboarding.university === 'University of Toronto';

  const profile = [
    ['University', onboarding.university],
    ['Year', onboarding.year],
    ['Program', onboarding.program],
  ] as const;

  return (
    <aside className={open ? 'sidebar show' : 'sidebar'} aria-label="Sidebar Navigation">
      <nav className="side-group" aria-label="Tools">
        <button type="button" className="side-row" onClick={onNewFolder}>
          <span className="side-tile is-blue">
            <Icon name="folder-outline" />
          </span>
          <span className="side-label">New Folder</span>
        </button>
        {isUofT && (
          <a className="side-row" href="/ai-planner/">
            <span className="side-tile is-purple">
              <Icon name="compass-outline" />
            </span>
            <span className="side-label">Course Planner</span>
            <Icon name="chevron-forward" className="side-chevron" />
          </a>
        )}
        {isUofT && (
          <a className="side-row" href="/professors/">
            <span className="side-tile is-amber">
              <Icon name="star-outline" />
            </span>
            <span className="side-label">Professor Picks</span>
            <Icon name="chevron-forward" className="side-chevron" />
          </a>
        )}
      </nav>

      <div className="side-group">
        <button type="button" className="side-row" onClick={onOpenSettings}>
          <span className="side-tile is-slate">
            <Icon name="settings-outline" />
          </span>
          <span className="side-label">Settings</span>
          <Icon name="chevron-forward" className="side-chevron" />
        </button>
        <button type="button" className="side-row" onClick={onOpenAbout}>
          <span className="side-tile is-slate">
            <Icon name="information-circle-outline" />
          </span>
          <span className="side-label">About</span>
          <Icon name="chevron-forward" className="side-chevron" />
        </button>
      </div>

      <section className="side-section" aria-label="Academic profile">
        <h2 className="side-heading">Academic Profile</h2>
        <dl className="side-group side-profile">
          {profile.map(([label, value]) => (
            <div className="side-profile-row" key={label}>
              <dt>{label}</dt>
              <dd className={value ? undefined : 'is-empty'}>{value || 'Not set'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="side-tip">
        <Icon name="bulb-outline" />
        <span>{tip}</span>
      </p>
    </aside>
  );
}
