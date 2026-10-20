'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TourField } from './AddCourseDialog';

/**
 * First-run walkthrough shown after signup. It points at real controls on the
 * dashboard, so it finds them by selector and measures them; the add-course
 * form locks every field except the one the current step is about.
 */
interface TourStep {
  title: string;
  body: string;
  selector?: string;
  center?: boolean;
  /** Element whose click advances the step (defaults to `selector`). */
  clickSelector?: string;
  requireClick?: boolean;
  /** Next stays disabled until this input has text. */
  requireInput?: string;
  preferPos?: 'left' | 'right' | 'top' | 'bottom';
  alignCenter?: boolean;
  spotlight?: boolean;
  hideNext?: boolean;
  /** Step happens inside the add-course dialog. */
  modalField?: TourField;
  modalPos?: 'top' | 'bottom';
  modalGap?: number;
  compact?: boolean;
  mobileWidth?: string;
  mobileMinHeight?: number;
  mobileOffsetX?: number;
}

const STEPS: TourStep[] = [
  { title: 'Welcome to MySemester', body: 'Let’s set up your dashboard in a few quick steps.', center: true },
  {
    title: 'Update your profile',
    body: 'Tap the profile icon to edit your name, email, and avatar.',
    selector: '#accountBtn',
    preferPos: 'right',
    spotlight: true,
    mobileWidth: 'min(360px, 60vw)',
    mobileMinHeight: 300,
    mobileOffsetX: -18,
  },
  {
    title: 'Add your first course',
    body: 'Tap Add Course to create your first class.',
    selector: '.empty-state-card',
    clickSelector: '#emptyAddCourseBtn',
    preferPos: 'bottom',
    spotlight: true,
    requireClick: true,
    hideNext: true,
  },
  {
    title: 'Course code',
    body: 'Enter the course code (e.g., ECO101).',
    selector: '#courseCodeField',
    modalField: 'code',
    requireInput: '#codeInput',
    modalPos: 'top',
    modalGap: -60,
    compact: true,
    mobileWidth: 'min(500px, 86vw)',
  },
  {
    title: 'Course name',
    body: 'Add the course name so it is easy to recognize.',
    selector: '#courseNameField',
    modalField: 'title',
    requireInput: '#titleInput',
    modalGap: -60,
    compact: true,
    mobileWidth: 'min(500px, 86vw)',
  },
  {
    title: 'Initial grade (optional)',
    body: 'Add a starting grade if you already have one.',
    selector: '#initialGradeField',
    modalField: 'grade',
    modalPos: 'bottom',
    modalGap: -80,
    compact: true,
  },
  {
    title: 'Pick an icon',
    body: 'Open the icon menu, choose a style, and check its preview.',
    selector: '#iconField',
    modalField: 'icon',
    modalPos: 'bottom',
    modalGap: -80,
    compact: true,
  },
  {
    title: 'Save your course',
    body: 'Tap Save Course to add it to your dashboard.',
    selector: '#saveCourse',
    modalField: 'save',
    requireClick: true,
    hideNext: true,
    modalPos: 'top',
    modalGap: -300,
    compact: true,
  },
  {
    title: 'Open your course',
    body: 'Tap your new course card to open it.',
    selector: '.card',
    preferPos: 'bottom',
    alignCenter: true,
    spotlight: true,
    requireClick: true,
    hideNext: true,
  },
];

const FIELD_HIGHLIGHT: Partial<Record<TourField, string>> = {
  code: '#codeInput',
  title: '#titleInput',
  grade: '#gradeInput',
  icon: '#iconSelectButton',
  save: '#saveCourse',
};

const isMobile = () => window.innerWidth <= 640;

/** Add classes to an element and keep them there even if React rewrites its className. */
function stickyClasses(el: Element | null, classes: string[]): () => void {
  if (!el) return () => {};
  const apply = () => classes.forEach((c) => el.classList.contains(c) || el.classList.add(c));
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  return () => {
    observer.disconnect();
    el.classList.remove(...classes);
  };
}

function setSpot(el: HTMLElement, prefix: string, rect: { x: number; y: number; w: number; h: number } | null) {
  for (const [key, value] of Object.entries(rect ?? {})) {
    el.style.setProperty(`--${prefix}-${key}`, `${value}px`);
  }
  if (!rect) ['x', 'y', 'w', 'h'].forEach((k) => el.style.removeProperty(`--${prefix}-${k}`));
}

interface TourProps {
  onClose: () => void;
  /** Called when a step needs the add-course dialog open. */
  ensureAddCourseOpen: () => void;
  /** Tells the dashboard which form field the current step unlocks (null = not a form step). */
  onFieldChange: (field: TourField | null) => void;
}

export function Tour({ onClose, ensureAddCourseOpen, onFieldChange }: TourProps) {
  const [index, setIndex] = useState(0);
  /** Step index whose required input currently has text. */
  const [filledStep, setFilledStep] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const step = STEPS[index];
  const inModal = !!step.modalField;
  const nextDisabled = !!step.requireClick || (!!step.requireInput && filledStep !== index);
  const modal = typeof document !== 'undefined' ? (document.getElementById('addCourseModal') as HTMLDialogElement | null) : null;

  const close = () => {
    onFieldChange(null);
    onClose();
  };

  const advance = () => {
    if (index < STEPS.length - 1) setIndex(index + 1);
    else close();
  };

  // The per-step effect below must run once per step, not on every parent
  // render, or it would reopen the form right after the user saves it.
  const enterStep = useEffectEvent(() => {
    onFieldChange(step.modalField ?? null);
    if (step.modalField) ensureAddCourseOpen();
  });
  const advanceFromEffect = useEffectEvent(advance);

  // Body classes for the whole tour.
  useEffect(() => {
    document.body.classList.add('tour-lock', 'tour-restrict');
    return () => document.body.classList.remove('tour-lock', 'tour-restrict', 'tour-disable-target');
  }, []);

  // Per-step setup: open the form, lock fields, wire up required clicks and inputs.
  useEffect(() => {
    enterStep();

    const cleanups: (() => void)[] = [];
    const target = step.selector ? document.querySelector(step.selector) : null;
    const clickTarget = step.clickSelector ? document.querySelector(step.clickSelector) : target;

    if (target && !step.center && !step.modalField) {
      const extra = target.classList.contains('empty-state-card')
        ? ['tour-highlight-card']
        : target.matches('.avatar-btn, .iconbtn, button')
          ? ['tour-highlight-round']
          : [];
      cleanups.push(stickyClasses(target, ['tour-highlight', ...extra]));
    }
    const fieldSelector = step.modalField ? FIELD_HIGHLIGHT[step.modalField] : undefined;
    const field = fieldSelector ? document.querySelector(fieldSelector) : null;
    if (field) cleanups.push(stickyClasses(field, ['tour-field-highlight', 'tour-allow']));
    if (clickTarget) cleanups.push(stickyClasses(clickTarget, ['tour-allow']));
    if (step.modalField === 'icon') {
      cleanups.push(stickyClasses(document.querySelector('#iconField'), ['tour-allow']));
    }

    if (step.requireInput) {
      const input = document.querySelector<HTMLInputElement>(step.requireInput);
      if (input) {
        const check = () => setFilledStep(input.value.trim() ? index : null);
        input.addEventListener('input', check);
        const focusId = window.setTimeout(() => {
          input.focus();
          check();
        }, 0);
        cleanups.push(() => {
          window.clearTimeout(focusId);
          input.removeEventListener('input', check);
        });
      }
    }

    if (step.requireClick && clickTarget) {
      // The last step's click navigates away, so finish (and record the tour as seen) right away.
      const onClick = () => (index === STEPS.length - 1 ? advanceFromEffect() : window.setTimeout(advanceFromEffect, 60));
      clickTarget.addEventListener('click', onClick, { once: true });
      cleanups.push(() => clickTarget.removeEventListener('click', onClick));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [index, step]);

  // Position the callout and the spotlight around the target.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const overlay = overlayRef.current;
    if (!card || !overlay) return;

    const measure = () => {
      card.style.width = isMobile() && step.mobileWidth ? step.mobileWidth : '';
      card.style.minHeight = isMobile() && step.mobileMinHeight ? `${step.mobileMinHeight}px` : '';
      const target = step.selector ? document.querySelector<HTMLElement>(step.selector) : null;

      if (inModal && modal && target) {
        overlay.classList.remove('spotlight');
        const modalRect = modal.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        const pad = 10;
        modal.classList.add('tour-mask-active');
        setSpot(modal, 'modal-spot', {
          x: Math.max(rect.left - modalRect.left - pad, 0),
          y: Math.max(rect.top - modalRect.top - pad, 0),
          w: Math.min(rect.width + pad * 2, modalRect.width),
          h: Math.min(rect.height + pad * 2, modalRect.height),
        });
        const cardRect = card.getBoundingClientRect();
        const gap = step.modalGap ?? 16;
        const pos = step.modalPos ?? 'top';
        card.style.left = `${Math.round((modalRect.width - cardRect.width) / 2)}px`;
        card.style.top = `${Math.round(pos === 'bottom' ? modalRect.height + gap : -cardRect.height - gap)}px`;
        card.style.transform = 'translate(0, 0)';
        card.dataset.pos = pos;
        return;
      }

      if (modal) {
        modal.classList.remove('tour-mask-active');
        setSpot(modal, 'modal-spot', null);
      }

      if (!target || step.center) {
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
        card.dataset.pos = 'top';
      } else {
        const rect = target.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        let pos = step.preferPos ?? 'right';
        let top = rect.top + rect.height / 2 - cardRect.height / 2;
        let left = rect.right + 16;
        if (pos === 'right') {
          left = Math.max(12, rect.left - cardRect.width - 16);
        } else if (pos === 'left') {
          left = rect.right + 16;
          if (left + cardRect.width > window.innerWidth - 12) {
            pos = 'right';
            left = Math.max(12, rect.left - cardRect.width - 16);
          }
        } else if (pos === 'bottom') {
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - cardRect.width / 2;
        } else {
          top = rect.top - cardRect.height - 16;
          left = rect.left + rect.width / 2 - cardRect.width / 2;
        }
        if (isMobile()) left += step.mobileOffsetX ?? 0;
        top = Math.max(12, Math.min(top, window.innerHeight - cardRect.height - 12));
        if (step.alignCenter) left = rect.left + rect.width / 2 - cardRect.width / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));
        card.style.left = `${Math.round(left)}px`;
        card.style.top = `${Math.round(top)}px`;
        card.style.transform = 'translate(0, 0)';
        card.dataset.pos = pos;
      }

      if (step.spotlight && target && document.body.contains(target)) {
        const rect = target.getBoundingClientRect();
        const pad = 8;
        overlay.classList.add('spotlight');
        setSpot(overlay, 'spot', {
          x: Math.max(rect.left - pad, 0),
          y: Math.max(rect.top - pad, 0),
          w: Math.min(rect.width + pad * 2, window.innerWidth),
          h: Math.min(rect.height + pad * 2, window.innerHeight),
        });
      } else {
        overlay.classList.remove('spotlight');
        setSpot(overlay, 'spot', null);
      }
    };

    measure();
    // Targets can still be animating in or the dialog opening; measure again shortly.
    const raf = requestAnimationFrame(measure);
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 450);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', measure);
    };
  }, [step, inModal, modal]);

  // Leave the add-course dialog clean when the tour ends.
  useEffect(
    () => () => {
      const dialog = document.getElementById('addCourseModal');
      dialog?.classList.remove('tour-mask-active');
      if (dialog) setSpot(dialog, 'modal-spot', null);
    },
    [],
  );

  const callout = (
    <div
      ref={cardRef}
      className={['tour-card', step.compact && 'compact', inModal && 'in-modal', (step.center || inModal) && 'no-arrow']
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-live="polite"
      aria-label={step.title}
    >
      <div className="tour-pill">Getting Started</div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="tour-footer">
        <div className="tour-step">
          <span>
            {index + 1} of {STEPS.length}
          </span>
          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={i === index ? 'tour-dot active' : 'tour-dot'} />
            ))}
          </div>
        </div>
        <div className="tour-actions">
          <button className="tour-btn ghost" type="button" onClick={close}>
            Skip
          </button>
          {!step.hideNext && (
            <button className="tour-btn primary" type="button" disabled={nextDisabled} onClick={advance}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="tour-overlay show" ref={overlayRef} aria-hidden="false" style={{ display: 'flex' }}>
      {inModal && modal ? createPortal(callout, modal) : callout}
    </div>
  );
}
