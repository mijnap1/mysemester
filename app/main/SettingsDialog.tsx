'use client';

import { useRef, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/lib/theme';
import type { Settings, ThemeSetting } from '@/lib/types';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
  showGpa: boolean;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onBulkImport: () => void;
  onReset: () => void;
}

const THEMES: { value: ThemeSetting; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'desktop-outline' },
];

function clampTarget(raw: string): string | null {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return null;
  return String(Math.round(Math.max(50, Math.min(100, n))));
}

export function SettingsDialog({ open, onClose, ...props }: SettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} id="settingsModal">
      {open && <SettingsBody onClose={onClose} {...props} />}
    </Dialog>
  );
}

function SettingsBody({ onClose, settings, onChange, showGpa, onExport, onImportFile, onBulkImport, onReset }: Omit<SettingsDialogProps, 'open'>) {
  const { setting: theme, setSetting: setTheme } = useTheme();
  const [customTarget, setCustomTarget] = useState(settings.estimateTarget || '85');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  function save() {
    const target = clampTarget(customTarget);
    if (target) set({ estimateTarget: target });
    onClose();
  }

  return (
    <>
      <div className="modal-head">
        <Icon name="settings-outline" />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
          Settings
        </span>
      </div>
      <div className="modal-body" style={{ gap: 26 }}>
        <section className="settings-card">
          <div className="settings-card-title">
            <Icon name="color-palette-outline" />
            <span>Theme</span>
          </div>
          <div className="settings-theme-btnrow">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={theme === t.value ? 'settings-theme-btn active' : 'settings-theme-btn'}
                onClick={() => {
                  setTheme(t.value);
                  set({ theme: t.value });
                }}
              >
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <Icon name="grid-outline" />
            <span>Dashboard Layout</span>
          </div>
          <div className="settings-radio-row">
            {(['compact', 'spacious'] as const).map((layout) => (
              <label className="settings-radio" key={layout}>
                <input
                  type="radio"
                  name="layout"
                  value={layout}
                  className="settings-layout-radio"
                  checked={settings.layout === layout}
                  onChange={() => set({ layout })}
                />
                <span>{layout === 'compact' ? 'Compact' : 'Spacious'}</span>
              </label>
            ))}
          </div>
        </section>

        {showGpa && (
          <section className="settings-card">
            <div className="settings-card-title">
              <Icon name="stats-chart-outline" />
              <span>Default GPA Format</span>
            </div>
            <div className="settings-toggle-row">
              {(['4.0', '%'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  className={settings.gpaFormat === format ? 'settings-gpa-btn active' : 'settings-gpa-btn'}
                  onClick={() => set({ gpaFormat: format })}
                >
                  {format}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="settings-card">
          <div className="settings-card-title">
            <Icon name="speedometer-outline" />
            <span>Estimate Target</span>
          </div>
          <div className="settings-toggle-row">
            {['85', '90', '95'].map((target) => (
              <button
                key={target}
                type="button"
                className={settings.estimateTarget === target ? 'settings-estimate-btn active' : 'settings-estimate-btn'}
                onClick={() => {
                  setCustomTarget(target);
                  set({ estimateTarget: target });
                }}
              >
                {target}
              </button>
            ))}
            <div className="settings-estimate-input">
              <span>Custom</span>
              <input
                type="number"
                min={50}
                max={100}
                step={1}
                placeholder="e.g. 88"
                aria-label="Custom estimate target"
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                onBlur={() => {
                  const target = clampTarget(customTarget);
                  if (target) {
                    setCustomTarget(target);
                    set({ estimateTarget: target });
                  }
                }}
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <Icon name="cloud-download-outline" />
            <span>Data Controls</span>
          </div>
          <div className="settings-data-btnrow">
            <button type="button" className="btn-plain" onClick={onExport}>
              <Icon name="download-outline" /> Export Courses
            </button>
            <button type="button" className="btn-plain" onClick={() => fileRef.current?.click()}>
              <Icon name="cloud-upload-outline" /> Import Courses
            </button>
            <button type="button" className="btn-plain" onClick={onBulkImport}>
              <Icon name="document-text-outline" /> Bulk Import (CSV)
            </button>
            <button type="button" className="btn-plain danger" onClick={onReset}>
              <Icon name="refresh-outline" /> Reset All Data
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onImportFile(file);
            }}
          />
        </section>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={save}>
          Save
        </button>
        <button type="button" className="btn-plain" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
