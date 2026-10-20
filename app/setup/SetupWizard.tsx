'use client';

import { Fragment, useEffect, useState } from 'react';
import { UNIVERSITIES } from '@/lib/grading';
import { PROGRAMS, YEARS } from '@/lib/options';
import { hasCompletedSetup, readAuth } from '@/lib/semester';
import { KEYS, writeJson } from '@/lib/storage';
import type { Onboarding } from '@/lib/types';

const STEPS = [
  { key: 'university', title: 'Which university are you attending?', options: UNIVERSITIES },
  { key: 'year', title: 'What is your current year of study?', options: YEARS },
  { key: 'program', title: 'What is your program of study?', options: PROGRAMS },
] as const satisfies readonly { key: keyof Onboarding; title: string; options: readonly string[] }[];

export function SetupWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Onboarding>({});

  useEffect(() => {
    if (!readAuth().loggedIn) window.location.assign('/login/');
    else if (hasCompletedSetup()) window.location.assign('/main/');
  }, []);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const selected = answers[step.key];

  function next() {
    if (!selected) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    writeJson(KEYS.onboarding, answers);
    window.location.assign('/main/');
  }

  return (
    <main className="wrap">
      <header className="hero">
        <div className="hero-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
          <img src="/mysemesterlogo.png" alt="MySemester logo" />
        </div>
        <div>
          <p className="eyebrow">Setup</p>
          <h1 id="stepTitle" className="title">
            {step.title}
          </h1>
        </div>
      </header>

      {/* Keyed by step so the entrance animation replays on each step. */}
      <section className="panel step-enter" key={stepIndex}>
        <div className="panel-head">
          <div className="stepper" aria-hidden="true">
            {STEPS.map((_, i) => (
              <Fragment key={i}>
                <span className={`step-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}`} />
                {i < STEPS.length - 1 && <span className={`step-rail${i < stepIndex ? ' done' : ''}`} />}
              </Fragment>
            ))}
          </div>
          <div className="pager">
            {stepIndex + 1} / {STEPS.length}
          </div>
        </div>
        <div className="options">
          {step.options.map((option, i) => (
            <button
              key={option}
              type="button"
              className={`option${selected === option ? ' active' : ''}`}
              style={{ ['--opt-delay' as string]: `${Math.min(i * 22, 240)}ms` }}
              onClick={() => setAnswers((a) => ({ ...a, [step.key]: option }))}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="footer">
          <div className="footer-left">
            <button
              type="button"
              className="back"
              style={{ display: stepIndex === 0 ? 'none' : 'inline-flex' }}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
          </div>
          <button type="button" className="next" disabled={!selected} onClick={next}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </section>
    </main>
  );
}
