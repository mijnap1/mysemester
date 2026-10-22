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
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];
const TARGETS = ['85', '90', '95'];

function clampTarget(raw: string): string | null {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return null;
  return String(Math.round(Math.max(50, Math.min(100, n))));
}

/** One row of joined choices; the selected one is raised. */
function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : undefined} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} />}
          {o.label}
        </button>
      ))}
    </div>
  );
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
  const isCustom = !TARGETS.includes(settings.estimateTarget);

  function commitCustom() {
    const target = clampTarget(customTarget);
    if (!target) return;
    setCustomTarget(target);
    if (target !== settings.estimateTarget) set({ estimateTarget: target });
  }

  function done() {
    commitCustom();
    onClose();
  }

  return (
    <>
      <div className="st-head">
        <span className="ad-icon">
          <Icon name="settings-outline" />
        </span>
        <h2>Settings</h2>
        <button type="button" className="st-close" aria-label="Close settings" onClick={done}>
          <Icon name="close-outline" />
        </button>
      </div>

      <div className="st-body">
        <h3 className="side-heading">Appearance</h3>
        <div className="side-group">
          <div className="st-row">
            <span className="st-label">Theme</span>
            <Segmented
              label="Theme"
              value={theme}
              options={THEMES}
              onChange={(t) => {
                setTheme(t);
                set({ theme: t });
              }}
            />
          </div>
          <div className="st-row">
            <span className="st-label">Dashboard layout</span>
            <Segmented
              label="Dashboard layout"
              value={settings.layout}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'spacious', label: 'Spacious' },
              ]}
              onChange={(layout) => set({ layout })}
            />
          </div>
        </div>

        <h3 className="side-heading">Grades</h3>
        <div className="side-group">
          {showGpa && (
            <div className="st-row">
              <span className="st-label">GPA format</span>
              <Segmented
                label="GPA format"
                value={settings.gpaFormat}
                options={[
                  { value: '4.0', label: '4.0 scale' },
                  { value: '%', label: 'Percent' },
                ]}
                onChange={(gpaFormat) => set({ gpaFormat })}
              />
            </div>
          )}
          <div className="st-row">
            <span className="st-label">Estimate target</span>
            <span className="st-hint">What “Estimate” on a course aims for.</span>
            <div className="st-target">
              <Segmented
                label="Estimate target"
                value={isCustom ? ('' as string) : settings.estimateTarget}
                options={TARGETS.map((t) => ({ value: t, label: t }))}
                onChange={(t) => {
                  setCustomTarget(t);
                  set({ estimateTarget: t });
                }}
              />
              <label className={isCustom ? 'st-custom is-on' : 'st-custom'}>
                <span>Custom</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={100}
                  step={1}
                  aria-label="Custom estimate target"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  onBlur={commitCustom}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </label>
            </div>
          </div>
        </div>

        <h3 className="side-heading">Your data</h3>
        <div className="side-group">
          <button type="button" className="side-row" onClick={onExport}>
            <span className="side-tile is-blue">
              <Icon name="download-outline" />
            </span>
            <span className="side-label">Export courses</span>
          </button>
          <button type="button" className="side-row" onClick={() => fileRef.current?.click()}>
            <span className="side-tile is-blue">
              <Icon name="cloud-upload-outline" />
            </span>
            <span className="side-label">Import courses</span>
          </button>
          <button type="button" className="side-row" onClick={onBulkImport}>
            <span className="side-tile is-blue">
              <Icon name="document-text-outline" />
            </span>
            <span className="side-label">Bulk import (CSV)</span>
            <Icon name="chevron-forward" className="side-chevron" />
          </button>
        </div>
        <div className="side-group">
          <button type="button" className="side-row is-danger" onClick={onReset}>
            <span className="side-tile is-red">
              <Icon name="refresh-outline" />
            </span>
            <span className="side-label">Reset all data</span>
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
      </div>

      <div className="st-foot">
        <button type="button" className="btn-primary" onClick={done}>
          Done
        </button>
      </div>
    </>
  );
}
