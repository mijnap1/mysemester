'use client';

import { Icon } from '@/components/Icon';
import { useRotating } from '@/lib/hooks';
import type { Onboarding } from '@/lib/types';

const TIPS = [
  'Right-click a course card to edit, duplicate, remove from folder, and more.',
  'Double-click an assessment name or weight to edit it.',
  'Use the target estimate to see what you need on remaining work.',
  'Switch between compact and spacious layouts in Settings.',
];

interface SidebarProps {
  open: boolean;
  onboarding: Onboarding;
  onNewFolder: () => void;
  /** Whether a Quercus calendar feed is connected on this device. */
  quercusConnected: boolean;
  onQuercus: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export function Sidebar({ open, onboarding, onNewFolder, quercusConnected, onQuercus, onOpenSettings, onOpenAbout }: SidebarProps) {
  const tip = useRotating(TIPS, 6000);
  const isUofT = onboarding.university === 'University of Toronto';

  return (
    <aside className={open ? 'sidebar show' : 'sidebar'} aria-label="Sidebar Navigation">
      <button className="navbtn blue" onClick={onNewFolder}>
        <Icon name="folder-outline" /> New Folder
      </button>
      <button className="navbtn blue" onClick={onQuercus} hidden={!isUofT}>
        <Icon name="calendar-outline" /> {quercusConnected ? 'Quercus Deadlines' : 'Connect Quercus'}
      </button>
      <a className="navbtn purple" href="/ai-planner/" hidden={!isUofT}>
        <Icon name="sparkles-outline" /> AI Planner
      </a>
      <a className="navbtn gold" href="/professors/" hidden={!isUofT}>
        <Icon name="star-outline" /> Professor Picks
      </a>
      <button className="navbtn blue" onClick={onOpenSettings}>
        <Icon name="settings-outline" /> Settings
      </button>
      <button className="navbtn gray" onClick={onOpenAbout}>
        <Icon name="information-circle-outline" /> About
      </button>
      <div className="sidebar-help">
        <div className="sidebar-help-title">
          <Icon name="help-circle-outline" /> Quick Tip
        </div>
        <div className="sidebar-help-text">{tip}</div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-title">Academic Profile</div>
        <div className="sidebar-card">
          <span className="label">University</span>
          <span className="value">{onboarding.university || 'Not set'}</span>
        </div>
        <div className="sidebar-card">
          <span className="label">Year</span>
          <span className="value">{onboarding.year || 'Not set'}</span>
        </div>
        <div className="sidebar-card">
          <span className="label">Program</span>
          <span className="value">{onboarding.program || 'Not set'}</span>
        </div>
      </div>
    </aside>
  );
}
