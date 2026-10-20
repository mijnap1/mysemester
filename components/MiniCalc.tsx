'use client';

import { useEffect, useRef, useState } from 'react';
import { CALC_INITIAL, calcBackspace, calcEquals, calcInput, calcToggleSign, type CalcState } from '@/lib/calculator';
import { useClickOutside } from '@/lib/hooks';
import { Icon } from './Icon';

type Key = { label: string; value?: string; action?: 'clear' | 'backspace' | 'sign' | 'equals'; className?: string };

const KEYS: Key[] = [
  { label: 'C', action: 'clear', className: 'is-muted' },
  { label: '⌫', action: 'backspace', className: 'is-muted' },
  { label: '+/-', action: 'sign', className: 'is-muted' },
  { label: '÷', value: '÷', className: 'is-op' },
  { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' },
  { label: '×', value: '×', className: 'is-op' },
  { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' },
  { label: '-', value: '-', className: 'is-op' },
  { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' },
  { label: '+', value: '+', className: 'is-op' },
  { label: '%', value: '%', className: 'is-muted' },
  { label: '0', value: '0' },
  { label: '.', value: '.' },
  { label: '=', action: 'equals', className: 'is-eq' },
];

function apply(state: CalcState, key: Key): CalcState {
  switch (key.action) {
    case 'clear':
      return CALC_INITIAL;
    case 'backspace':
      return calcBackspace(state);
    case 'sign':
      return calcToggleSign(state);
    case 'equals':
      return calcEquals(state);
    default:
      return key.value ? calcInput(state, key.value) : state;
  }
}

/** Floating calculator button and popover. Keyboard input works while it is open. */
export function MiniCalc() {
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState<CalcState>(CALC_INITIAL);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useClickOutside([fabRef, panelRef], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;

      let next: ((s: CalcState) => CalcState) | null = null;
      if (/^[0-9]$/.test(e.key) || ['.', '+', '-', '%'].includes(e.key)) next = (s) => calcInput(s, e.key);
      else if (e.key === '*' || e.key.toLowerCase() === 'x') next = (s) => calcInput(s, '×');
      else if (e.key === '/') next = (s) => calcInput(s, '÷');
      else if (e.key === 'Enter' || e.key === '=') next = calcEquals;
      else if (e.key === 'Backspace') next = calcBackspace;
      else if (e.key === 'Delete') next = () => CALC_INITIAL;
      if (next) {
        e.preventDefault();
        setCalc(next);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="calc-fab"
        aria-label="Open calculator"
        aria-expanded={open}
        title="Calculator"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="calculator-outline" />
      </button>

      <section ref={panelRef} className={open ? 'mini-calc show' : 'mini-calc'} aria-hidden={!open}>
        <div className="mini-calc-head">
          <div className="mini-calc-title">
            <Icon name="calculator-outline" />
            Calculator
          </div>
          <button type="button" className="mini-calc-close" aria-label="Close calculator" onClick={() => setOpen(false)}>
            <Icon name="close-outline" />
          </button>
        </div>
        <div className="mini-calc-display">{calc.expression || '0'}</div>
        <div className="mini-calc-grid">
          {KEYS.map((key) => (
            <button
              key={key.label}
              type="button"
              className={key.className ? `mini-calc-btn ${key.className}` : 'mini-calc-btn'}
              onClick={() => setCalc((s) => apply(s, key))}
            >
              {key.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
