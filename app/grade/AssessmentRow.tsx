'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { Assessment } from '@/lib/types';

const PARTIAL_NUMBER = /^(\d+)?(\.)?(\d{0,2})?$/;

function formatNumber(value: number | null): string {
  return value == null ? '' : String(value);
}

/**
 * A 0–100 number input that lets the user type freely ("8", "8.", "8.5")
 * and only commits values that parse; it clamps and rounds on blur.
 */
function PercentInput({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) {
  const [text, setText] = useState(formatNumber(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatNumber(value));
  }, [value]);

  function handleChange(raw: string) {
    setText(raw);
    const trimmed = raw.trim();
    if (trimmed === '') return onCommit(null);
    if (!PARTIAL_NUMBER.test(trimmed) || trimmed.endsWith('.')) return;
    const n = parseFloat(trimmed);
    if (!Number.isNaN(n)) onCommit(n);
  }

  function handleBlur() {
    focused.current = false;
    const n = parseFloat(text.trim());
    if (text.trim() === '' || text.trim() === '.' || Number.isNaN(n)) {
      setText('');
      onCommit(null);
      return;
    }
    const clamped = Math.round(Math.max(0, Math.min(100, n)) * 100) / 100;
    setText(clamped.toFixed(2).replace(/\.?0+$/, ''));
    onCommit(clamped);
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={100}
      step={0.01}
      aria-label={label}
      value={text}
      onFocus={() => (focused.current = true)}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  );
}

const INLINE_EDIT_STYLE = {
  border: '2px solid var(--blue)',
  borderRadius: 6,
  fontFamily: 'Outfit',
  fontSize: 16,
  padding: '6px 8px',
} as const;

/** A cell edited by double-click (or long-press on touch screens). */
function EditableCell({
  display,
  kind,
  onSave,
}: {
  display: string;
  kind: 'name' | 'weight';
  onSave: (raw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });

  function begin() {
    setDraft(display);
    setEditing(true);
  }

  function clearPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  const isCoarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  if (editing) {
    return (
      <td data-edit={kind} className={`cell-${kind}`}>
        <input
          autoFocus
          type={kind === 'weight' ? 'number' : 'text'}
          min={kind === 'weight' ? 0 : undefined}
          max={kind === 'weight' ? 100 : undefined}
          aria-label={kind === 'weight' ? 'Weight' : 'Assessment name'}
          style={{ ...INLINE_EDIT_STYLE, textAlign: kind === 'name' ? 'left' : undefined }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onSave(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      </td>
    );
  }

  return (
    <td
      data-edit={kind}
      className={`cell-${kind}`}
      onDoubleClick={begin}
      onTouchStart={(e) => {
        if (!isCoarse() || e.touches.length !== 1) return;
        pressStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        clearPress();
        pressTimer.current = window.setTimeout(begin, 420);
      }}
      onTouchMove={(e) => {
        if (!pressTimer.current || !e.touches.length) return;
        const dx = Math.abs(e.touches[0].clientX - pressStart.current.x);
        const dy = Math.abs(e.touches[0].clientY - pressStart.current.y);
        if (dx > 8 || dy > 8) clearPress();
      }}
      onTouchEnd={clearPress}
      onTouchCancel={clearPress}
    >
      {display}
    </td>
  );
}

interface AssessmentRowProps {
  assessment: Assessment;
  /** Highest weight this row may take without the total passing 100. */
  maxWeight: number;
  onChange: (patch: Partial<Assessment>, notify: boolean) => void;
  onRemove: () => void;
}

export function AssessmentRow({ assessment, maxWeight, onChange, onRemove }: AssessmentRowProps) {
  return (
    <tr>
      <EditableCell
        kind="name"
        display={assessment.name}
        onSave={(raw) => {
          const name = raw.trim();
          if (name && name !== assessment.name) onChange({ name }, false);
        }}
      />
      <EditableCell
        kind="weight"
        display={String(assessment.weight)}
        onSave={(raw) => {
          const weight = parseFloat(raw);
          if (Number.isNaN(weight) || weight < 0) return;
          const adjusted = Math.round(Math.min(weight, maxWeight) * 100) / 100;
          if (adjusted !== assessment.weight) onChange({ weight: adjusted }, false);
        }}
      />
      <td className="cell-grade" data-label="Your grade">
        <PercentInput label={`${assessment.name} grade`} value={assessment.grade} onCommit={(grade) => onChange({ grade }, true)} />
      </td>
      <td className="cell-estimate" data-label="Estimate">
        <PercentInput label={`${assessment.name} estimate`} value={assessment.estimate} onCommit={(estimate) => onChange({ estimate }, false)} />
      </td>
      <td className="cell-remove">
        <button type="button" className="remove-btn" aria-label={`Remove ${assessment.name}`} onClick={onRemove}>
          <Icon name="trash-outline" />
        </button>
      </td>
    </tr>
  );
}
