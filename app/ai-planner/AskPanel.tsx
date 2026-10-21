'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import {
  answerAskQuestion,
  askSuggestions,
  buildAskAnalysis,
  formatPercent,
  OFFICIAL_NOTE,
  riskLine,
  type AskAnalysis,
  type SeedCourse,
} from '@/lib/ai-planner';
import { readSemesterPayload } from './SemesterPanels';
import { Card, List } from './ui';

const LOADING_STEPS = [
  'Collecting saved MySemester grade data...',
  'Checking course risk and missing assessments...',
  'Calculating your tier score...',
  'Building your A+ upgrade plan...',
];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="ask-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

type Message = { from: 'user' | 'bot'; text: string };

export function AskPanel({ active, seed }: { active: boolean; seed: SeedCourse[] }) {
  const [analysis, setAnalysis] = useState<AskAnalysis | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function introFor(a: AskAnalysis): Message {
    return a.counts.total
      ? {
          from: 'bot',
          text: `I analyzed ${a.counts.total} course${a.counts.total === 1 ? '' : 's'} and placed you at ${a.tier.label}. Ask what is hurting your tier, what to focus on this week, or how to push toward A+.`,
        }
      : { from: 'bot', text: 'Add courses and grades in MySemester, then come back here and run the analyzer.' };
  }

  async function analyze() {
    setRevealed(false);
    for (const step of LOADING_STEPS) {
      setLoadingStep(step);
      await sleep(420);
    }
    const next = buildAskAnalysis(seed, readSemesterPayload());
    setAnalysis(next);
    setMessages([introFor(next)]);
    setLoadingStep(null);
    requestAnimationFrame(() => setRevealed(true));
  }

  function ask(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    let current = analysis;
    if (!current) {
      current = buildAskAnalysis(seed, readSemesterPayload());
      setAnalysis(current);
      setRevealed(true);
    }
    setMessages((m) => [...(m.length ? m : [introFor(current)]), { from: 'user', text: q }, { from: 'bot', text: answerAskQuestion(q, current) }]);
    setQuestion('');
  }

  const loading = loadingStep !== null;
  const a = analysis;
  const riskItems = a ? [...a.groups.atRisk, ...a.groups.watch, ...a.groups.unknown, ...a.groups.safe].map(riskLine) : [];

  return (
    <section className={active ? 'panel tab-panel active' : 'panel tab-panel'} id="askPanel">
      <div className="panel-head">
        <div>
          <h2>Ask AI Planner</h2>
          <p>Analyze your saved MySemester grades, get a tier, and ask questions against your actual course data.</p>
        </div>
      </div>

      <div className="ask-premium-intro">
        <div>
          <span className="premium-kicker">
            <Icon name="sparkles-outline" /> Premium MVP
          </span>
          <h3>Analyze your semester instantly</h3>
          <p>
            No setup form. Ask AI Planner pulls your saved MySemester courses, grades, and assessment rows, then builds your
            tier and next moves.
          </p>
        </div>
        <button className="btn-primary ask-analyze-btn" type="button" disabled={loading} onClick={() => void analyze()}>
          {loading ? (
            <>
              <Icon name="pulse-outline" /> Analyzing...
            </>
          ) : a ? (
            <>
              <Icon name="refresh-outline" /> Analyze again
            </>
          ) : (
            <>
              <Icon name="analytics-outline" /> Analyze now
            </>
          )}
        </button>
      </div>

      <div className="ask-loading" hidden={!loading} aria-live="polite">
        <div className="analysis-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <h3>Analyzing your semester</h3>
          <p>{loadingStep}</p>
        </div>
        <div className="analysis-progress" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className={revealed ? 'ask-dashboard ask-reveal is-visible' : 'ask-dashboard ask-reveal'} hidden={!a || loading}>
        <div className="tier-hero">
          {a && !a.counts.total && (
            <div className="tier-main recovery">
              <span>No Tier Yet</span>
              <strong>Add course data first</strong>
              <p>Ask AI Planner needs saved MySemester courses or grades before it can analyze your semester.</p>
            </div>
          )}
          {a && a.counts.total > 0 && (
            <>
              <div className={`tier-main ${a.tier.className}`}>
                <span>{a.tier.headline}</span>
                <strong>{a.tier.label}</strong>
                <p>Score {Math.round(a.score)} / 100 from your saved MySemester data.</p>
              </div>
              <div className="tier-breakdown">
                <Metric label="Safe" value={String(a.counts.safe)} />
                <Metric label="Watch" value={String(a.counts.watch)} />
                <Metric label="At risk" value={String(a.counts.atRisk)} />
                <Metric label="Unknown" value={String(a.counts.unknown)} />
              </div>
            </>
          )}
        </div>
        <div className="ask-section-grid">
          {a && !a.counts.total && (
            <Card title="What to do next" full>
              <List items={askSuggestions(a)} />
            </Card>
          )}
          {a && a.counts.total > 0 && (
            <>
              <Card title="Academic Snapshot">
                <div className="ask-metric-grid">
                  <Metric label="Average" value={formatPercent(a.average)} note={`${a.counts.graded}/${a.counts.total} courses graded`} />
                  <Metric label="Strongest" value={a.strongest ? `${a.strongest.code} ${formatPercent(a.strongest.grade)}` : 'Unknown'} />
                  <Metric label="Priority" value={a.topPriority ? a.topPriority.code : 'None yet'} />
                  <Metric label="Missing" value={String(a.counts.missing)} note="assessment rows without grades" />
                </div>
              </Card>
              <Card title="Course Risk Analysis">
                <List items={riskItems.length ? riskItems : ['No course risks detected yet.']} />
              </Card>
              <Card title="Tier Score">
                <p>
                  Your current tier is <strong>{a.tier.label}</strong>. The biggest penalties come from at-risk courses, missing
                  grades, and uneven performance across courses.
                </p>
              </Card>
              <Card title="Push To A+ Plan" warning>
                <List items={askSuggestions(a)} />
              </Card>
              <Card title="Official verification" full warning>
                <p>{OFFICIAL_NOTE}</p>
              </Card>
            </>
          )}
        </div>
      </div>

      <section className={revealed ? 'ask-chat-panel ask-reveal is-visible' : 'ask-chat-panel ask-reveal'} hidden={!a || loading}>
        <div className="panel-head">
          <div>
            <h3>Chat With Ask AI Planner</h3>
            <p>Ask about your tier, course risks, weekly focus, or how to push toward A+.</p>
          </div>
        </div>
        <div className="ask-chat-log" ref={logRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.from}`}>
              {m.text}
            </div>
          ))}
        </div>
        <form className="ask-form" onSubmit={ask}>
          <label>
            Question
            <textarea name="question" placeholder="What is hurting my tier the most?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <button className="btn-primary" type="submit">
            <Icon name="send-outline" /> Ask
          </button>
        </form>
      </section>
    </section>
  );
}
