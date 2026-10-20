'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useClickOutside, useEscape } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  loggedIn: boolean;
  name: string;
  email: string;
  picture: string;
  showProfessorPicksCallout: boolean;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onToggleMenu: () => void;
}

export function Header({ loggedIn, name, email, picture, showProfessorPicksCallout, onOpenProfile, onSignOut, onToggleMenu }: HeaderProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const { isDark, toggle } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside([wrapRef], () => setAccountOpen(false), accountOpen);
  useEscape(() => setAccountOpen(false), accountOpen);

  const openProfile = () => {
    setAccountOpen(false);
    onOpenProfile();
  };

  return (
    <header>
      <div className="brand">
        <Icon name="school-outline" style={{ fontSize: 22, color: 'var(--blue)' }} />
        <h1>MySemester</h1>
      </div>

      <div className="h-controls">
        <div className="account-wrap" ref={wrapRef}>
          <button className="iconbtn avatar-btn" id="accountBtn" aria-label="Account" aria-expanded={accountOpen} onClick={() => setAccountOpen((o) => !o)}>
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
              <img id="accountAvatar" alt="Profile" className="avatar-inset" src={picture} style={{ display: 'block' }} />
            ) : (
              <Icon name="person-circle-outline" id="accountIcon" />
            )}
          </button>
          <div className={accountOpen ? 'account-dd show' : 'account-dd'} role="menu" aria-label="Account menu">
            <div
              className="acc-row"
              onClick={loggedIn ? openProfile : undefined}
              role={loggedIn ? 'button' : undefined}
              tabIndex={loggedIn ? 0 : undefined}
              onKeyDown={(e) => loggedIn && e.key === 'Enter' && openProfile()}
            >
              <div className="dd-avatar">
                {picture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
                  <img alt="Profile" src={picture} style={{ display: 'block', objectFit: 'cover', borderRadius: 12, width: 48, height: 48 }} />
                ) : (
                  <Icon name="person-circle-outline" style={{ fontSize: 24 }} />
                )}
              </div>
              <div className="acc-meta">
                <span className="acc-name">{loggedIn ? name : 'Guest'}</span>
                <span className="acc-user">{loggedIn ? email || 'Signed in' : 'Not signed in'}</span>
              </div>
            </div>
            {loggedIn ? (
              <div className="acc-actions">
                <button onClick={openProfile}>
                  <Icon name="person-outline" /> Profile
                </button>
                <button onClick={onSignOut}>
                  <Icon name="log-out-outline" /> Sign out
                </button>
              </div>
            ) : (
              <div className="acc-actions">
                <a href="/login/">
                  <Icon name="log-in-outline" /> Sign in
                </a>
                <a href="/signup/">
                  <Icon name="person-add-outline" /> Create account
                </a>
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
              <span className="chip">
                <Icon name="id-card-outline" /> Private
              </span>
              <span className="chip">{loggedIn ? `Welcome, ${name}` : 'Welcome'}</span>
            </div>
          </div>
        </div>
        <button className="iconbtn" id="themeToggle" aria-label="Toggle theme" onClick={toggle}>
          <Icon name={isDark ? 'sunny-outline' : 'moon-outline'} />
        </button>
        <div className="sidebar-menu-feature">
          <div className="sidebar-menu-callout" hidden={!showProfessorPicksCallout}>
            <span>New</span>
            Professor Picks is here
          </div>
          <button className="iconbtn menu-icon" id="menuToggle" aria-label="Open Menu" onClick={onToggleMenu}>
            <Icon name="menu-outline" />
          </button>
        </div>
      </div>
    </header>
  );
}
