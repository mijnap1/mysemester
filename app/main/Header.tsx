'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useClickOutside, useEscape } from '@/lib/hooks';
import { initials } from '@/lib/profile';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  loggedIn: boolean;
  name: string;
  email: string;
  picture: string;
  /** Short "New" hint shown under the menu button, or null for none. */
  menuCallout: string | null;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onToggleMenu: () => void;
  /** Whether the menu drawer is open; the button then shows a close icon. */
  menuOpen: boolean;
}

export function Header({ loggedIn, name, email, picture, menuCallout, onOpenProfile, onSignOut, onToggleMenu, menuOpen }: HeaderProps) {
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
              className={loggedIn ? 'acc-head is-link' : 'acc-head'}
              onClick={loggedIn ? openProfile : undefined}
              role={loggedIn ? 'button' : undefined}
              tabIndex={loggedIn ? 0 : undefined}
              onKeyDown={(e) => loggedIn && e.key === 'Enter' && openProfile()}
            >
              {picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
                <img className="acc-avatar" alt="" src={picture} />
              ) : loggedIn ? (
                <span className="acc-avatar is-initials" aria-hidden="true">
                  {initials(name)}
                </span>
              ) : (
                <span className="acc-avatar is-guest" aria-hidden="true">
                  <Icon name="person-outline" />
                </span>
              )}
              <div className="acc-meta">
                <span className="acc-name">{loggedIn ? name : 'Guest'}</span>
                <span className="acc-user">{loggedIn ? email || 'Signed in' : 'Sign in to sync across devices'}</span>
              </div>
            </div>
            <div className="acc-sep" role="separator" />
            {loggedIn ? (
              <>
                <button type="button" role="menuitem" className="acc-item" onClick={openProfile}>
                  <Icon name="person-outline" /> Profile
                </button>
                <div className="acc-sep" role="separator" />
                <button type="button" role="menuitem" className="acc-item is-danger" onClick={onSignOut}>
                  <Icon name="log-out-outline" /> Sign out
                </button>
              </>
            ) : (
              <>
                <a role="menuitem" className="acc-item" href="/login/">
                  <Icon name="log-in-outline" /> Sign in
                </a>
                <a role="menuitem" className="acc-item" href="/signup/">
                  <Icon name="person-add-outline" /> Create account
                </a>
              </>
            )}
          </div>
        </div>
        <button className="iconbtn" id="themeToggle" aria-label="Toggle theme" onClick={toggle}>
          <Icon name={isDark ? 'sunny-outline' : 'moon-outline'} />
        </button>
        <div className="sidebar-menu-feature">
          <div className="sidebar-menu-callout" hidden={!menuCallout}>
            <span>New</span>
            {menuCallout}
          </div>
          <button
            className="iconbtn menu-icon"
            id="menuToggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
          >
            <Icon name={menuOpen ? 'close-outline' : 'menu-outline'} />
          </button>
        </div>
      </div>
    </header>
  );
}
