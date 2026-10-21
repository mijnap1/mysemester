'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useClickOutside } from '@/lib/hooks';
import {
  applyRefresh,
  dueLabel,
  feedCourses,
  fetchDeadlines,
  findHeavyWeek,
  groupDeadlines,
  inGrades,
  matchCourse,
  normalizeFeedUrl,
  readQuercusLink,
  relativeDue,
  toggleDone,
  toggleHidden,
  visibleDeadlines,
  type Deadline,
  type HeavyWeek,
  type QuercusLink,
} from '@/lib/quercus';
import type { Course } from '@/lib/types';

/** Opening the dashboard refreshes the feed when the copy is older than this. */
const STALE_MS = 15 * 60_000;
const LATER_PREVIEW = 4;

interface UpcomingPanelProps {
  /** Storage user (username or "guest"). */
  user: string;
  /** The connected feed; the dashboard owns it and saves every change. */
  link: QuercusLink;
  onLinkChange: (next: QuercusLink | null) => void;
  courses: Course[];
  onOpenCourse: (id: string) => void;
  /** Add a deadline as a grade row on its course. */
  onAddToGrades: (deadline: Deadline, course: Course) => void;
  notify: (message: string, type?: 'info' | 'success' | 'error') => void;
  confirmDisconnect: () => Promise<boolean>;
}

export function UpcomingPanel({ user, link, onLinkChange: save, courses, onOpenCourse, onAddToGrades, notify, confirmDisconnect }: UpcomingPanelProps) {
  // Opening the dashboard with a stale copy starts a refresh straight away.
  const [refreshing, setRefreshing] = useState(() => isStale(link));
  const [showAllLater, setShowAllLater] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const filterRef = useRef<HTMLDivElement>(null);
  useClickOutside([filterRef], () => setFilterOpen(false), filterOpen);

  /** Fetch the feed. The caller sets `refreshing` first. */
  const load = useCallback(
    async (quiet: boolean) => {
      const current = readQuercusLink(user);
      try {
        if (!current) return;
        const deadlines = await fetchDeadlines(current.feedUrl);
        // Re-read so a tick made during the request is kept.
        const latest = readQuercusLink(user) ?? current;
        save(applyRefresh(latest, deadlines, new Date().toISOString()));
        setNow(Date.now());
        if (!quiet) notify('Quercus deadlines updated.', 'success');
      } catch (err) {
        notify(err instanceof Error ? err.message : "Couldn't refresh Quercus deadlines.", 'error');
      } finally {
        setRefreshing(false);
      }
    },
    [notify, save, user],
  );

  const startedOnOpen = useRef(false);
  useEffect(() => {
    if (startedOnOpen.current || !refreshing) return;
    startedOnOpen.current = true;
    void load(true);
  }, [load, refreshing]);

  function refresh() {
    setRefreshing(true);
    void load(false);
  }

  // Keep the "in 3 hrs" labels current.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function disconnect() {
    if (await confirmDisconnect()) {
      save(null);
      notify('Quercus disconnected.', 'info');
    }
  }

  const done = new Set(link.done);
  const groups = groupDeadlines(visibleDeadlines(link), done, now);
  const heavy = findHeavyWeek(link, now);
  const courseList = feedCourses(link);
  const hiddenCount = link.hidden.length;
  const later = showAllLater ? groups.later : groups.later.slice(0, LATER_PREVIEW);
  const empty = !groups.overdue.length && !groups.today.length && !groups.week.length && !groups.later.length;

  const row = (d: Deadline) => (
    <DeadlineRow
      key={d.id}
      deadline={d}
      done={done.has(d.id)}
      course={matchCourse(d, courses)}
      now={now}
      onToggle={() => save(toggleDone(link, d.id))}
      onOpenCourse={onOpenCourse}
      onAddToGrades={onAddToGrades}
    />
  );

  return (
    <section className="upcoming" id="upcoming" aria-labelledby="upcoming-title">
      <div className="upcoming-head">
        <h3 id="upcoming-title">
          <Icon name="calendar-outline" /> Upcoming
        </h3>
        <span className="upcoming-synced">{refreshing ? 'Syncing…' : syncedLabel(link.syncedAt, now)}</span>
        <div className="upcoming-filter" ref={filterRef}>
          <button
            type="button"
            className={hiddenCount ? 'upcoming-icon-btn is-active' : 'upcoming-icon-btn'}
            aria-label="Choose courses"
            title="Choose courses"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
          >
            <Icon name="options-outline" />
          </button>
          {filterOpen && (
            <div className="upcoming-filter-menu" role="group" aria-label="Courses shown">
              <div className="upcoming-filter-title">Show deadlines from</div>
              {courseList.map((c) => (
                <label key={c.key} className="upcoming-filter-row">
                  <input type="checkbox" checked={!c.hidden} onChange={() => save(toggleHidden(link, c.key))} />
                  <span className="upcoming-filter-name">{c.key}</span>
                  <span className="upcoming-filter-count">{c.count}</span>
                </label>
              ))}
              {!courseList.length && <div className="upcoming-filter-empty">No courses in your feed yet.</div>}
            </div>
          )}
        </div>
        {/* The spin class goes on the button: changing an <ion-icon>'s class wipes its "hydrated" class and hides it. */}
        <button
          type="button"
          className={refreshing ? 'upcoming-icon-btn is-spinning' : 'upcoming-icon-btn'}
          aria-label="Refresh from Quercus"
          title="Refresh from Quercus"
          disabled={refreshing}
          onClick={refresh}
        >
          <Icon name="refresh-outline" />
        </button>
        <button type="button" className="upcoming-icon-btn" aria-label="Disconnect Quercus" title="Disconnect Quercus" onClick={() => void disconnect()}>
          <Icon name="unlink-outline" />
        </button>
      </div>

      {heavy && <HeavyWeekBanner week={heavy} />}

      {empty ? (
        <p className="upcoming-empty">{hiddenCount ? 'Nothing due in the courses you’re showing.' : 'Nothing due in Quercus right now. 🎉'}</p>
      ) : (
        <div className="upcoming-groups">
          <Group label="Overdue" tone="danger" items={groups.overdue} render={row} />
          <Group label="Today" items={groups.today} render={row} />
          <Group label="Next 7 days" items={groups.week} render={row} />
          <Group label="Later" items={later} render={row}>
            {groups.later.length > LATER_PREVIEW && (
              <button type="button" className="upcoming-more" onClick={() => setShowAllLater((v) => !v)}>
                {showAllLater ? 'Show less' : `Show ${groups.later.length - LATER_PREVIEW} more`}
              </button>
            )}
          </Group>
        </div>
      )}
      <p className="upcoming-note">Only items your instructors post to the Quercus calendar appear here. Check each syllabus for test dates.</p>
    </section>
  );
}

function Group({
  label,
  tone,
  items,
  render,
  children,
}: {
  label: string;
  tone?: 'danger';
  items: Deadline[];
  render: (d: Deadline) => React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!items.length) return null;
  return (
    <div className="upcoming-group">
      <div className={tone === 'danger' ? 'upcoming-group-label is-danger' : 'upcoming-group-label'}>{label}</div>
      <ul>{items.map(render)}</ul>
      {children}
    </div>
  );
}

function HeavyWeekBanner({ week }: { week: HeavyWeek }) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const parts = [
    week.tests && `${week.tests} test${week.tests === 1 ? '' : 's'}`,
    week.assignments && `${week.assignments} assignment${week.assignments === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return (
    <div className="upcoming-heavy" role="note">
      <Icon name="flame-outline" />
      <span>
        <strong>Heavy week ahead:</strong> {parts.join(' and ')}, {fmt(week.start)} – {fmt(week.end)}
      </span>
    </div>
  );
}

const KIND_LABEL = { assignment: 'Assignment', test: 'Test', event: 'Event' } as const;

function DeadlineRow({
  deadline: d,
  done,
  course,
  now,
  onToggle,
  onOpenCourse,
  onAddToGrades,
}: {
  deadline: Deadline;
  done: boolean;
  course: Course | null;
  now: number;
  onToggle: () => void;
  onOpenCourse: (id: string) => void;
  onAddToGrades: (deadline: Deadline, course: Course) => void;
}) {
  const canAdd = !!course && d.kind !== 'event';
  const added = !!course && inGrades(d, course);
  const code = course?.code ?? d.courseCode ?? (d.courseName || 'Quercus');
  return (
    <li className={done ? 'deadline is-done' : 'deadline'}>
      {d.kind === 'event' ? (
        <span className="deadline-dot" aria-hidden />
      ) : (
        <input type="checkbox" className="deadline-check" checked={done} onChange={onToggle} aria-label={`Mark ${d.title} as done`} />
      )}
      <div className="deadline-main">
        {d.url ? (
          <a className="deadline-title" href={d.url} target="_blank" rel="noopener noreferrer">
            {d.title}
          </a>
        ) : (
          <span className="deadline-title">{d.title}</span>
        )}
        <div className="deadline-meta">
          {course ? (
            <button type="button" className="deadline-course" onClick={() => onOpenCourse(course.id)} title={`Open ${course.code}`}>
              {code}
            </button>
          ) : (
            <span className="deadline-course is-static">{code}</span>
          )}
          {d.kind !== 'assignment' && <span className={`deadline-kind is-${d.kind}`}>{KIND_LABEL[d.kind]}</span>}
          {canAdd &&
            (added ? (
              <span className="deadline-added">
                <Icon name="checkmark-outline" /> In grades
              </span>
            ) : (
              <button type="button" className="deadline-add" onClick={() => onAddToGrades(d, course)}>
                <Icon name="add-outline" /> Add to grades
              </button>
            ))}
        </div>
      </div>
      <div className="deadline-when">
        <span>{dueLabel(d, now)}</span>
        <small>{relativeDue(Date.parse(d.dueAt), now)}</small>
      </div>
    </li>
  );
}

function isStale(link: QuercusLink | null): boolean {
  return !!link && !(Date.now() - Date.parse(link.syncedAt) < STALE_MS);
}

function syncedLabel(syncedAt: string, now: number): string {
  const t = Date.parse(syncedAt);
  if (!Number.isFinite(t)) return 'Not synced yet';
  const mins = Math.round((now - t) / 60_000);
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins} min ago`;
  return `Synced ${new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

// ---------------------------------------------------------------------------

/** The Deadlines tab before Quercus is connected. */
export function QuercusConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="upcoming deadlines-connect">
      <div className="deadlines-connect-icon">
        <Icon name="calendar-outline" />
      </div>
      <h3>Connect Quercus</h3>
      <p>See every assignment, quiz and test deadline from your courses in one list.</p>
      <button type="button" className="btn-primary" onClick={onConnect}>
        Connect Quercus
      </button>
    </section>
  );
}

export function ConnectQuercusDialog({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (feedUrl: string, deadlines: Deadline[]) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} id="quercusConnectModal">
      {open && <ConnectBody onClose={onClose} onConnected={onConnected} />}
    </Dialog>
  );
}

function ConnectBody({ onClose, onConnected }: { onClose: () => void; onConnected: (feedUrl: string, deadlines: Deadline[]) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const feedUrl = normalizeFeedUrl(value);
    if (!feedUrl) {
      setError('Paste the link from Quercus → Calendar → Calendar Feed. It starts with https://q.utoronto.ca/feeds/calendars/');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onConnected(feedUrl, await fetchDeadlines(feedUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to Quercus.");
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="modal-head">
        <Icon name="calendar-outline" />
        <span>Connect Quercus</span>
      </div>
      <div className="modal-body">
        <ol className="quercus-steps">
          <li>
            Open{' '}
            <a href="https://q.utoronto.ca/calendar" target="_blank" rel="noopener noreferrer">
              Quercus Calendar
            </a>
            .
          </li>
          <li>
            At the bottom of the right sidebar, click <strong>Calendar Feed</strong>.
          </li>
          <li>Copy the link and paste it below.</li>
        </ol>
        <input
          autoFocus
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://q.utoronto.ca/feeds/calendars/user_…ics"
          aria-label="Quercus calendar feed link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && (
          <div className="error" style={{ display: 'block' }}>
            {error}
          </div>
        )}
        <p className="quercus-privacy">
          <Icon name="lock-closed-outline" /> This link only lets MySemester read your due dates. It stays on this device, and you can disconnect at any time. MySemester is not affiliated
          with the University of Toronto.
        </p>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-plain" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </form>
  );
}
