'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { signOut } from '@/lib/auth';
import { getUniversityRules, isCourseFinished, semesterOverview } from '@/lib/grading';
import { useEscape } from '@/lib/hooks';
import { applyBulkCsv, buildExport, parseImport } from '@/lib/import-export';
import {
  clearSettings,
  displayName,
  readOnboarding,
  readProfile,
  readSettings,
  safePictureUrl,
  writeOnboarding,
  writeProfile,
  writeSettings,
} from '@/lib/profile';
import {
  addCourse,
  addFolder,
  deleteFolder,
  duplicateCourse,
  folderNameTaken,
  moveCourse,
  moveFolder,
  removeCourse,
  renameFolder,
  replaceCourses,
  resetState,
  restoreCourse,
  setCurrentFolder,
  storageUser,
  newId,
  setAssessments,
  updateCourse,
  type CourseInput,
} from '@/lib/semester';
import {
  assessmentFromDeadline,
  countDueSoon,
  inGrades,
  nextDeadlineFor,
  readQuercusLink,
  writeQuercusLink,
  type Deadline,
  type NextDeadline,
  type QuercusLink,
} from '@/lib/quercus';
import { allKeys, KEYS, readString, removeKey, writeString } from '@/lib/storage';
import type { Course, Folder, Onboarding, Profile, Settings } from '@/lib/types';
import { useSemester } from '@/lib/use-semester';
import { fetchMyRatedCourses, ratingCourseCode } from '@/lib/professor-ratings';
import { normalizeCourseQuery } from '@/lib/timetable';
import { RateDialog, type RateTarget } from '../professors/RateDialog';
import { AboutDialog } from './AboutDialog';
import { AddCourseDialog, type TourField } from './AddCourseDialog';
import { useAppDialogs } from './AppDialogs';
import { BulkImportDialog } from './BulkImportDialog';
import { CourseMenu, FolderMenu, type MenuPosition } from './ContextMenus';
import { CourseGrid } from './CourseGrid';
import { Header } from './Header';
import { ProfileDialog } from './ProfileDialog';
import { SettingsDialog } from './SettingsDialog';
import { Sidebar } from './Sidebar';
import { Tour } from './Tour';
import { QuercusPrompt } from './QuercusPrompt';
import { ConnectQuercusDialog, QuercusConnectCard, UpcomingPanel } from './UpcomingPanel';

const HIGHLIGHT_MS = 600;
const REMOVE_ANIMATION_MS = 260;
const UNDO_MS = 4500;

function gpaLabel(scale: number | null): string {
  if (scale == null) return 'GPA';
  return `GPA (${Number.isInteger(scale) && scale < 10 ? scale.toFixed(1) : scale})`;
}

function readJsonArray(key: string): string[] {
  try {
    const value: unknown = JSON.parse(readString(key) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function Dashboard() {
  const { auth, state, update, updateLocal, initialSyncing, syncError } = useSemester();

  const [onboarding, setOnboarding] = useState<Onboarding>(readOnboarding);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [profile, setProfile] = useState<Profile | null>(() => readProfile(auth));
  const user = storageUser(auth);
  const [quercus, setQuercus] = useState<QuercusLink | null>(() => readQuercusLink(user));
  const [quercusConnectOpen, setQuercusConnectOpen] = useState(false);
  const [quercusPromptOpen, setQuercusPromptOpen] = useState(false);
  // UofT students switch between their courses and their Quercus deadlines.
  const [view, setView] = useState<'courses' | 'deadlines'>(() => (readString(KEYS.dashboardView) === 'deadlines' ? 'deadlines' : 'courses'));
  const [calloutVisible, setCalloutVisible] = useState(
    () => readOnboarding().university === 'University of Toronto' && readString(KEYS.professorPicksHintSeen) !== '1',
  );
  const [tourActive, setTourActive] = useState(false);
  // "Rate your professor" on finished courses: codes already rated (null until known) and codes dismissed.
  const [ratedCodes, setRatedCodes] = useState<Set<string> | null>(null);
  const [dismissedRateCodes, setDismissedRateCodes] = useState<Set<string>>(() => new Set(readJsonArray(KEYS.ratePromptDismissed)));
  const [rateTarget, setRateTarget] = useState<RateTarget | null>(null);
  const [tourField, setTourField] = useState<TourField | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null });
  const [courseMenu, setCourseMenu] = useState<MenuPosition | null>(null);
  const [folderMenu, setFolderMenu] = useState<MenuPosition | null>(null);

  const [highlight, setHighlight] = useState<{ course: string | null; folder: string | null }>({ course: null, folder: null });
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { confirm, notice, input, dialogs } = useAppDialogs();
  const { show: showToast, toast } = useToast();

  // First visit after signup: start the walkthrough once the dashboard has painted.
  useEffect(() => {
    if (readString(KEYS.tutorialStart) !== '1' || readString(KEYS.tutorialSeen)) return;
    const id = window.setTimeout(() => setTourActive(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  // Invite UofT students to connect Quercus once the page has settled (never over the tour).
  const isUofT = onboarding.university === 'University of Toronto';
  // The tour points at course cards, so it always runs on the Courses view.
  const activeView = isUofT && !tourActive ? view : 'courses';
  const dueSoon = useMemo(() => countDueSoon(quercus), [quercus]);
  const nextDeadlines = useMemo(() => {
    const map = new Map<string, NextDeadline>();
    if (!isUofT || !quercus) return map;
    for (const course of state.courses) {
      const next = nextDeadlineFor(course, quercus, state.courses);
      if (next) map.set(course.id, next);
    }
    return map;
  }, [isUofT, quercus, state.courses]);
  useEffect(() => {
    if (!isUofT || !auth.loggedIn) return;
    let live = true;
    void fetchMyRatedCourses().then((codes) => live && setRatedCodes(codes));
    return () => {
      live = false;
    };
  }, [isUofT, auth.loggedIn]);
  const ratePrompts = useMemo(() => {
    const ids = new Set<string>();
    if (!isUofT || !auth.loggedIn || !ratedCodes || tourActive) return ids;
    for (const course of state.courses) {
      const code = normalizeCourseQuery(course.code);
      if (!code || !isCourseFinished(course)) continue;
      const key = ratingCourseCode(code);
      if (!ratedCodes.has(key) && !dismissedRateCodes.has(key)) ids.add(course.id);
    }
    return ids;
  }, [isUofT, auth.loggedIn, ratedCodes, dismissedRateCodes, tourActive, state.courses]);
  function openRatePrompt(courseId: string) {
    const course = state.courses.find((c) => c.id === courseId);
    const code = course && normalizeCourseQuery(course.code);
    if (code) setRateTarget({ courseCode: code, instructorName: '', term: '', existing: undefined });
  }

  useEffect(() => {
    if (!isUofT || quercus || initialSyncing || tourActive) return;
    if (readString(KEYS.quercusPromptDismissed) === '1') return;
    if (readString(KEYS.tutorialStart) === '1' && !readString(KEYS.tutorialSeen)) return;
    const id = window.setTimeout(() => setQuercusPromptOpen(true), 1200);
    return () => window.clearTimeout(id);
  }, [isUofT, quercus, initialSyncing, tourActive]);

  useEffect(() => {
    document.body.setAttribute('data-layout', settings.layout === 'spacious' ? 'spacious' : 'compact');
  }, [settings.layout]);

  useEffect(() => {
    document.body.classList.toggle('sync-active', initialSyncing);
  }, [initialSyncing]);

  useEffect(() => {
    if (syncError) showToast(syncError, 'error', 4200);
  }, [syncError, showToast]);

  useEffect(() => {
    if (!highlight.course && !highlight.folder) return;
    const id = window.setTimeout(() => setHighlight({ course: null, folder: null }), HIGHLIGHT_MS);
    return () => window.clearTimeout(id);
  }, [highlight]);

  // Context menus close on the next click anywhere.
  useEffect(() => {
    if (!courseMenu && !folderMenu) return;
    const close = () => {
      setCourseMenu(null);
      setFolderMenu(null);
    };
    const id = window.setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('click', close);
    };
  }, [courseMenu, folderMenu]);

  useEscape(() => {
    setSidebarOpen(false);
    setCourseMenu(null);
    setFolderMenu(null);
  });

  const rules = getUniversityRules(onboarding.university ?? '');
  const name = displayName(auth, profile);
  const picture = safePictureUrl(profile?.picture);
  const currentFolder = state.folders.find((f) => f.id === state.currentFolderId) ?? null;
  const scoped = currentFolder ? state.courses.filter((c) => c.folderId === currentFolder.id) : state.courses;
  const overview = semesterOverview(scoped, rules);
  const editingCourse = courseDialog.editingId ? state.courses.find((c) => c.id === courseDialog.editingId) ?? null : null;
  const editingInput = useMemo<CourseInput | null>(
    () => (editingCourse ? { code: editingCourse.code, title: editingCourse.title, icon: editingCourse.icon, grade: editingCourse.grade } : null),
    [editingCourse],
  );
  const menuCourse = courseMenu ? state.courses.find((c) => c.id === courseMenu.id) : undefined;
  const menuFolder = folderMenu ? state.folders.find((f) => f.id === folderMenu.id) : undefined;

  const closeSidebar = () => setSidebarOpen(false);

  // ---- Courses -----------------------------------------------------------

  const openAddCourse = useCallback(() => setCourseDialog({ open: true, editingId: null }), []);
  const ensureAddCourseOpen = useCallback(() => setCourseDialog((d) => (d.open ? d : { open: true, editingId: null })), []);

  function saveCourse(values: CourseInput) {
    if (courseDialog.editingId) {
      const id = courseDialog.editingId;
      update((s) => updateCourse(s, id, values));
    } else {
      let newId = '';
      update((s) => {
        const result = addCourse(s, values, null);
        newId = result.id;
        return result.state;
      });
      setHighlight({ course: newId, folder: null });
    }
    setCourseDialog({ open: false, editingId: null });
    closeSidebar();
  }

  async function handleRemoveCourse(id: string) {
    const code = state.courses.find((c) => c.id === id)?.code || 'this course';
    const ok = await confirm({
      title: `Remove ${code}?`,
      message: 'Its assessments and grades go with it. You can undo right after.',
      confirmText: 'Remove',
      confirmTone: 'danger',
      icon: 'trash-outline',
    });
    if (!ok) return;
    setRemovingId(id);
    window.setTimeout(() => {
      setRemovingId(null);
      let removed = null as { course: Course; index: number } | null;
      update((s) => {
        const result = removeCourse(s, id);
        if (result.removed) removed = { course: result.removed, index: result.index };
        return result.state;
      });
      if (!removed) return;
      const { course, index } = removed;
      showToast(`${course.code || 'Course'} removed.`, 'info', UNDO_MS, {
        label: 'Undo',
        onClick: () => {
          update((s) => (s.courses.some((c) => c.id === course.id) ? s : restoreCourse(s, course, index)));
          setHighlight({ course: course.id, folder: null });
        },
      });
    }, REMOVE_ANIMATION_MS);
  }

  function handleCourseAction(action: 'edit' | 'dup' | 'detach' | 'crncr' | 'del', id: string) {
    setCourseMenu(null);
    if (action === 'edit') setCourseDialog({ open: true, editingId: id });
    if (action === 'del') void handleRemoveCourse(id);
    if (action === 'dup') {
      let copyId: string | null = null;
      update((s) => {
        const result = duplicateCourse(s, id);
        copyId = result.id;
        return result.state;
      });
      setHighlight({ course: copyId, folder: null });
    }
    if (action === 'detach') {
      update((s) => moveCourse(s, id, null));
      setHighlight({ course: id, folder: null });
    }
    if (action === 'crncr' && rules.creditAllowed) {
      update((s) => updateCourse(s, id, { crncr: !s.courses.find((c) => c.id === id)?.crncr }));
    }
  }

  // ---- Folders -----------------------------------------------------------

  async function handleNewFolder() {
    closeSidebar();
    const folderName = await input({
      title: 'New folder',
      message: 'Group courses by term, year or anything you like.',
      placeholder: 'e.g. Winter 2026',
      confirmText: 'Create folder',
      icon: 'folder-outline',
      validate: (value) => (!value ? 'Folder name is required.' : folderNameTaken(state, value) ? 'A folder with that name already exists.' : ''),
    });
    if (!folderName) return;
    let newId = '';
    update((s) => {
      const result = addFolder(s, folderName, s.currentFolderId);
      newId = result.id;
      return result.state;
    });
    setHighlight({ course: null, folder: newId });
  }

  async function handleRenameFolder(id: string) {
    const folder = state.folders.find((f) => f.id === id);
    if (!folder) return;
    const next = await input({
      title: 'Rename folder',
      initialValue: folder.name,
      placeholder: 'e.g. Midterms',
      confirmText: 'Rename',
      validate: (value) => (!value ? 'Folder name is required.' : folderNameTaken(state, value, id) ? 'A folder with that name already exists.' : ''),
    });
    if (next) update((s) => renameFolder(s, id, next));
  }

  async function handleFolderAction(action: 'rename' | 'detach' | 'del', id: string) {
    setFolderMenu(null);
    const folder = state.folders.find((f) => f.id === id);
    if (!folder) return;
    if (action === 'rename') await handleRenameFolder(id);
    if (action === 'detach') update((s) => moveFolder(s, id, null));
    if (action === 'del') {
      const ok = await confirm({
        title: `Delete “${folder.name}”?`,
        message: 'Its courses move back to your dashboard. Nothing inside is deleted.',
        confirmText: 'Delete folder',
        confirmTone: 'danger',
        icon: 'trash-outline',
      });
      if (ok) update((s) => deleteFolder(s, id));
    }
  }

  // ---- Settings & data ---------------------------------------------------

  function changeSettings(next: Settings) {
    setSettings(next);
    writeSettings(next);
  }

  function exportCourses() {
    try {
      const blob = new Blob([JSON.stringify(buildExport(state), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mysemester-courses-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      void notice('Something went wrong while exporting your courses. Try again in a moment.', 'Export failed', 'alert-circle-outline');
    }
  }

  async function importFile(file: File) {
    let parsed;
    try {
      parsed = parseImport(await file.text());
    } catch (err) {
      console.error('Import error:', err);
      await notice('Couldn’t read this file. Make sure it’s a MySemester export.', 'Import failed', 'alert-circle-outline');
      return;
    }
    if (!parsed) return void notice('This file doesn’t look like a MySemester export.', 'Import failed', 'alert-circle-outline');
    if (!parsed.courses.length) return void notice('No courses were found in this file.', 'Import failed', 'alert-circle-outline');
    const ok = await confirm({
      title: `Import ${parsed.courses.length} course${parsed.courses.length === 1 ? '' : 's'}?`,
      message: state.courses.length
        ? `They replace the ${state.courses.length} course${state.courses.length === 1 ? '' : 's'} on your dashboard now.`
        : 'They’ll be added to your dashboard.',
      confirmText: 'Import',
      confirmTone: state.courses.length ? 'danger' : 'primary',
      icon: 'download-outline',
    });
    if (!ok) return;
    const { courses, folders } = parsed;
    update((s) => {
      const withCourses = replaceCourses(s, courses);
      if (!folders) return withCourses;
      const keep = new Set(folders.map((f) => f.id));
      const dropped = s.folders.filter((f) => !keep.has(f.id)).map((f) => f.id);
      return {
        ...withCourses,
        folders,
        currentFolderId: null,
        sync: { ...withCourses.sync, pendingFolderDeletes: [...new Set([...withCourses.sync.pendingFolderDeletes, ...dropped])] },
      };
    });
    showToast('Courses imported successfully.', 'success');
  }

  function bulkImport(csv: string): string | null {
    const result = applyBulkCsv(state, csv);
    if (!result.ok) return result.error;
    update(() => result.state);
    setHighlight({ course: result.firstCourseId, folder: result.firstFolderId });
    return null;
  }

  async function resetAll() {
    const ok = await confirm({
      title: 'Reset all data?',
      message: 'Every course, folder and grade on this account will be deleted. This can’t be undone.',
      confirmText: 'Reset all data',
      confirmTone: 'danger',
      icon: 'warning-outline',
    });
    if (!ok) return;
    update(resetState);
    const prefix = `grades_${user}_`;
    allKeys().filter((k) => k.startsWith(prefix)).forEach(removeKey);
    clearSettings();
    setSettings(readSettings());
    showToast('All data for this account has been reset.', 'success');
  }

  // ---- Profile -----------------------------------------------------------

  function saveProfile(next: Profile, nextOnboarding: Onboarding): boolean {
    writeProfile(auth, next);
    writeOnboarding(nextOnboarding);
    setProfile(next);
    const universityChanged = !!onboarding.university && !!nextOnboarding.university && nextOnboarding.university !== onboarding.university;
    setOnboarding(nextOnboarding);
    return universityChanged;
  }

  async function handleSignOut() {
    await signOut();
    window.location.assign('/login/');
  }

  function toggleMenu() {
    if (!sidebarOpen) {
      writeString(KEYS.professorPicksHintSeen, '1');
      setCalloutVisible(false);
    }
    setSidebarOpen((o) => !o);
  }

  // ---- Quercus -----------------------------------------------------------

  const saveQuercus = useCallback(
    (next: QuercusLink | null) => {
      setQuercus(next);
      writeQuercusLink(user, next);
    },
    [user],
  );

  /** "Add to grades": a new unweighted row on the course's grade page, named after the deadline. */
  function addDeadlineToGrades(deadline: Deadline, course: Course) {
    update((s) => {
      const current = s.courses.find((c) => c.id === course.id);
      if (!current || inGrades(deadline, current)) return s;
      return setAssessments(s, current.id, [...current.assessments, assessmentFromDeadline(deadline, newId())]);
    });
    showToast(`Added “${deadline.title}” to ${course.code}. Set its weight there.`, 'success', 5000, {
      label: 'Open',
      onClick: () => window.location.assign(`/grade/?id=${encodeURIComponent(course.id)}`),
    });
  }

  function changeView(next: 'courses' | 'deadlines') {
    setView(next);
    writeString(KEYS.dashboardView, next);
  }

  function dismissQuercusPrompt() {
    setQuercusPromptOpen(false);
    writeString(KEYS.quercusPromptDismissed, '1');
  }

  function endTour(finished = false) {
    // The last step opens the course page, which shows a one-time "You're all set".
    if (finished) writeString(KEYS.tutorialFinale, '1');
    writeString(KEYS.tutorialSeen, '1');
    removeKey(KEYS.tutorialStart);
    setTourActive(false);
    setTourField(null);
  }

  const backTarget = currentFolder?.parentFolderId ?? null;
  // The open folder and its parents, outermost first, for the breadcrumb.
  const folderPath: Folder[] = [];
  for (let f: Folder | undefined = currentFolder ?? undefined; f && !folderPath.includes(f); f = state.folders.find((x) => x.id === f!.parentFolderId)) {
    folderPath.unshift(f);
  }

  return (
    <>
      <div className={initialSyncing ? 'sync-overlay show' : 'sync-overlay'} aria-hidden={!initialSyncing}>
        <div className="sync-card" role="status" aria-live="polite">
          <div className="sync-spinner" />
          Syncing your courses...
        </div>
      </div>

      <Header
        loggedIn={auth.loggedIn}
        name={name}
        email={profile?.email || auth.email || ''}
        picture={picture}
        menuCallout={calloutVisible ? 'Professor Picks is here' : null}
        onOpenProfile={() => profile && setProfileOpen(true)}
        onSignOut={handleSignOut}
        onToggleMenu={toggleMenu}
        menuOpen={sidebarOpen}
      />
      <div
        className={sidebarOpen ? 'overlay show' : 'overlay'}
        onClick={() => {
          setSidebarOpen(false);
          setCourseMenu(null);
          setFolderMenu(null);
        }}
      />
      <Sidebar
        open={sidebarOpen}
        onboarding={onboarding}
        onNewFolder={handleNewFolder}
        onOpenSettings={() => {
          closeSidebar();
          setSettingsOpen(true);
        }}
        onOpenAbout={() => {
          closeSidebar();
          window.scrollTo({ top: 0, left: 0 });
          setAboutOpen(true);
        }}
      />

      <main className="wrap">
        <section className="hero">
          <h2>{auth.loggedIn ? `Welcome, ${name}` : 'Welcome'}</h2>
          <p>{activeView === 'deadlines' ? 'Upcoming deadlines from Quercus' : 'Courses and academic overview'}</p>
          {isUofT && (
            <div className="view-switch" role="tablist" aria-label="Dashboard view">
              <button type="button" role="tab" aria-selected={activeView === 'courses'} onClick={() => changeView('courses')}>
                <Icon name="school-outline" /> Courses
              </button>
              <button type="button" role="tab" aria-selected={activeView === 'deadlines'} onClick={() => changeView('deadlines')}>
                <Icon name="calendar-outline" /> Deadlines
                {dueSoon > 0 && (
                  <span className="view-switch-count" aria-label={`${dueSoon} due soon`}>
                    {dueSoon}
                  </span>
                )}
              </button>
            </div>
          )}
          {activeView === 'courses' && currentFolder && (
            <nav className="folder-crumbs" aria-label="Folder path">
              <button
                type="button"
                className="folder-crumbs-back"
                aria-label={backTarget ? 'Back to parent folder' : 'Back to all courses'}
                title={backTarget ? 'Back to parent folder' : 'Back to all courses'}
                onClick={() => updateLocal((s) => setCurrentFolder(s, backTarget))}
              >
                <Icon name="arrow-back-outline" />
              </button>
              <button type="button" className="folder-crumb" onClick={() => updateLocal((s) => setCurrentFolder(s, null))}>
                All courses
              </button>
              {folderPath.slice(0, -1).map((f) => (
                <Fragment key={f.id}>
                  <Icon name="chevron-forward-outline" className="folder-crumb-sep" />
                  <button type="button" className="folder-crumb" onClick={() => updateLocal((s) => setCurrentFolder(s, f.id))}>
                    {f.name}
                  </button>
                </Fragment>
              ))}
              <Icon name="chevron-forward-outline" className="folder-crumb-sep" />
              <span className="folder-crumb is-current" aria-current="page">
                {currentFolder.name}
              </span>
            </nav>
          )}
        </section>

        {activeView === 'courses' && (
          <>
            <CourseGrid
              state={state}
              rules={rules}
              highlightCourseId={highlight.course}
              highlightFolderId={highlight.folder}
              removingId={removingId}
              nextDeadlines={nextDeadlines}
              ratePrompts={ratePrompts}
              onRateCourse={openRatePrompt}
              onOpenCourse={(id) => window.location.assign(`/grade/?id=${encodeURIComponent(id)}`)}
              onOpenFolder={(id) => updateLocal((s) => setCurrentFolder(s, id))}
              onCourseMenu={(x, y, id) => {
                setFolderMenu(null);
                setCourseMenu({ x, y, id });
              }}
              onFolderMenu={(x, y, id) => {
                setCourseMenu(null);
                setFolderMenu({ x, y, id });
              }}
              onRenameFolder={(id) => void handleRenameFolder(id)}
              onMoveCourse={(courseId, folderId) => update((s) => moveCourse(s, courseId, folderId))}
              onMoveFolder={(folderId, parentId) => update((s) => moveFolder(s, folderId, parentId))}
              onAddCourse={openAddCourse}
              onAddFolder={() => void handleNewFolder()}
            />

            <section className="overview">
              {rules.showGpa && (
                <div className="ov">
                  <div className="label">{gpaLabel(rules.gpaScale)}</div>
                  <div className="value">{overview ? overview.gpa.toFixed(2) : '—'}</div>
                </div>
              )}
              {rules.showLetter && (
                <div className="ov">
                  <div className="label">Letter Avg</div>
                  <div className="value">{overview ? overview.letter : '—'}</div>
                </div>
              )}
              <div className="ov">
                <div className="label">Percent Avg</div>
                <div className="value">{overview ? `${Math.round(overview.average)}%` : '—'}</div>
              </div>
            </section>
          </>
        )}

        {activeView === 'deadlines' && !quercus && <QuercusConnectCard onConnect={() => setQuercusConnectOpen(true)} />}
        {activeView === 'deadlines' && quercus && (
          <UpcomingPanel
            user={user}
            link={quercus}
            onLinkChange={saveQuercus}
            courses={state.courses}
            onOpenCourse={(id) => window.location.assign(`/grade/?id=${encodeURIComponent(id)}`)}
            onAddToGrades={addDeadlineToGrades}
            notify={showToast}
            confirmDisconnect={() =>
              confirm({
                title: 'Disconnect Quercus?',
                message: 'Your Quercus deadlines will be removed from this device. Your courses and grades stay as they are.',
                confirmText: 'Disconnect',
                confirmTone: 'danger',
                icon: 'unlink-outline',
              })
            }
          />
        )}

        <footer>© 2026 MySemester. All Rights Reserved.</footer>
      </main>

      <CourseMenu
        position={courseMenu}
        inFolder={!!menuCourse?.folderId}
        creditLabel={rules.creditAllowed ? rules.creditLabel || 'CR/NCR' : null}
        creditOn={!!menuCourse?.crncr}
        onAction={handleCourseAction}
      />
      <FolderMenu position={folderMenu} hasParent={!!menuFolder?.parentFolderId} onAction={(a, id) => void handleFolderAction(a, id)} />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={changeSettings}
        showGpa={rules.showGpa}
        onExport={exportCourses}
        onImportFile={(file) => void importFile(file)}
        onBulkImport={() => setBulkOpen(true)}
        onReset={() => void resetAll()}
      />
      <RateDialog
        key={rateTarget?.courseCode ?? 'closed'}
        target={rateTarget}
        onClose={() => setRateTarget(null)}
        onSaved={(message) => {
          if (rateTarget) setRatedCodes((codes) => new Set(codes).add(ratingCourseCode(rateTarget.courseCode)));
          setRateTarget(null);
          showToast(message, 'success');
        }}
        onDismiss={() => {
          if (!rateTarget) return;
          const next = new Set(dismissedRateCodes).add(ratingCourseCode(rateTarget.courseCode));
          writeString(KEYS.ratePromptDismissed, JSON.stringify([...next]));
          setDismissedRateCodes(next);
          setRateTarget(null);
        }}
      />
      <QuercusPrompt
        open={quercusPromptOpen && !quercus && activeView === 'courses'}
        onConnect={() => {
          setQuercusPromptOpen(false);
          setQuercusConnectOpen(true);
        }}
        onDismiss={dismissQuercusPrompt}
      />
      <ConnectQuercusDialog
        open={quercusConnectOpen}
        onClose={() => setQuercusConnectOpen(false)}
        onConnected={(feedUrl, deadlines) => {
          saveQuercus({ feedUrl, deadlines, syncedAt: new Date().toISOString(), done: [], hidden: [] });
          setQuercusConnectOpen(false);
          showToast(`Connected. Found ${deadlines.length} item${deadlines.length === 1 ? '' : 's'} on Quercus.`, 'success');
          changeView('deadlines');
        }}
      />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onImport={bulkImport} />
      {profile && <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onboarding={onboarding} onSave={saveProfile} />}
      <AddCourseDialog
        open={courseDialog.open}
        onClose={() => setCourseDialog({ open: false, editingId: null })}
        editing={editingInput}
        onSave={saveCourse}
        tourField={tourActive ? tourField : null}
      />
      {dialogs}
      {toast}

      {tourActive && <Tour isUofT={isUofT} onClose={endTour} ensureAddCourseOpen={ensureAddCourseOpen} onFieldChange={setTourField} />}
    </>
  );
}
