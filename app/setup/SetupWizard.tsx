'use client';

import { Fragment, useEffect, useState } from 'react';
import { UNIVERSITIES } from '@/lib/grading';
import { filterProgramGroups, programGroupsFor, YEARS, type ProgramGroup } from '@/lib/options';
import { hasCompletedSetup, readAuth } from '@/lib/semester';
import { KEYS, writeJson } from '@/lib/storage';
import type { Onboarding } from '@/lib/types';

type StepKey = keyof Onboarding;

const STEP_TITLES: Record<StepKey, string> = {
  university: 'Which university are you attending?',
  year: 'What is your current year of study?',
  program: 'What is your program of study?',
};
const STEP_KEYS: StepKey[] = ['university', 'year', 'program'];

function groupsForStep(key: StepKey, answers: Onboarding): ProgramGroup[] {
  if (key === 'university') return [{ label: '', programs: [...UNIVERSITIES] }];
  if (key === 'year') return [{ label: '', programs: [...YEARS] }];
  return programGroupsFor(answers.university);
}

export function SetupWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Onboarding>({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!readAuth().loggedIn) window.location.assign('/login/');
    else if (hasCompletedSetup()) window.location.assign('/main/');
  }, []);

  const key = STEP_KEYS[stepIndex];
  const isLast = stepIndex === STEP_KEYS.length - 1;
  const selected = answers[key];
  const allGroups = groupsForStep(key, answers);
  const searchable = key === 'program' && allGroups.reduce((n, g) => n + g.programs.length, 0) > 12;
  const groups = searchable ? filterProgramGroups(allGroups, query) : allGroups;

  function goTo(index: number) {
    setStepIndex(index);
    setQuery('');
  }

  function choose(option: string) {
    setAnswers((a) => {
      const next = { ...a, [key]: option };
      // A different university has a different program list.
      if (key === 'university' && option !== a.university) {
        const programs = programGroupsFor(option).flatMap((g) => g.programs);
        if (next.program && !programs.includes(next.program)) delete next.program;
      }
      return next;
    });
  }

  function next() {
    if (!selected) return;
    if (!isLast) {
      goTo(stepIndex + 1);
      return;
    }
    writeJson(KEYS.onboarding, answers);
    window.location.assign('/main/');
  }

  let optionIndex = 0;

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
            {STEP_TITLES[key]}
          </h1>
        </div>
      </header>

      {/* Keyed by step so the entrance animation replays on each step. */}
      <section className="panel step-enter" key={stepIndex}>
        <div className="panel-head">
          <div className="stepper" aria-hidden="true">
            {STEP_KEYS.map((_, i) => (
              <Fragment key={i}>
                <span className={`step-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}`} />
                {i < STEP_KEYS.length - 1 && <span className={`step-rail${i < stepIndex ? ' done' : ''}`} />}
              </Fragment>
            ))}
          </div>
          <div className="pager">
            {stepIndex + 1} / {STEP_KEYS.length}
          </div>
        </div>
        {searchable && (
          <input
            className="option-search"
            type="search"
            placeholder={answers.university === 'University of Toronto' ? 'Search programs, e.g. Rotman, CS, UTSC' : 'Search programs'}
            aria-label="Search programs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="options">
          {groups.map((group) => (
            <Fragment key={group.label || 'all'}>
              {group.label && <div className="option-group-title">{group.label}</div>}
              {group.programs.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`option${selected === option ? ' active' : ''}`}
                  style={{ ['--opt-delay' as string]: `${Math.min(optionIndex++ * 22, 240)}ms` }}
                  onClick={() => choose(option)}
                >
                  {option}
                </button>
              ))}
            </Fragment>
          ))}
          {!groups.length && <p className="option-empty">No programs match “{query}”. Try another word, or pick Other.</p>}
        </div>
        <div className="footer">
          <div className="footer-left">
            <button
              type="button"
              className="back"
              style={{ display: stepIndex === 0 ? 'none' : 'inline-flex' }}
              onClick={() => goTo(Math.max(0, stepIndex - 1))}
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
