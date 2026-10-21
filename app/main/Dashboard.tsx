'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { signOut } from '@/lib/auth';
import { getUniversityRules, semesterOverview } from '@/lib/grading';
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
import type { Course, Onboarding, Profile, Settings } from '@/lib/types';
import { useSemester } from '@/lib/use-semester';
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
    const ok = await confirm({ title: 'Remove course?', message: 'Remove this course?', confirmText: 'Remove', confirmTone: 'danger' });
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
      message: 'Choose a folder name.',
      placeholder: 'e.g. Winter 2026',
      confirmText: 'Create folder',
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
      message: 'Choose a new folder name.',
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
        title: 'Delete folder?',
        message: `Delete folder "${folder.name}"? Courses will become unassigned.`,
        confirmText: 'Delete folder',
        confirmTone: 'danger',
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
      void notice('Sorry, something went wrong while exporting your courses.', 'Export failed');
    }
  }

  async function importFile(file: File) {
    let parsed;
    try {
      parsed = parseImport(await file.text());
    } catch (err) {
      console.error('Import error:', err);
      await notice('Could not read this file. Please make sure it is a valid MySemester export.', 'Import failed');
      return;
    }
    if (!parsed) return void notice('This file does not look like a valid MySemester export.', 'Import failed');
    if (!parsed.courses.length) return void notice('No courses were found in this file.', 'Import failed');
    const ok = await confirm({
      title: 'Import courses',
      message: `Import ${parsed.courses.length} courses? This will replace your current list.`,
      confirmText: 'Import',
      confirmTone: 'danger',
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
      message: 'Are you sure you want to reset ALL data for this account? This cannot be undone.',
      confirmText: 'Reset all data',
      confirmTone: 'danger',
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

  /** Sidebar button: open the Deadlines view (it offers Connect when needed). */
  function openQuercus() {
    closeSidebar();
    changeView('deadlines');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        quercusConnected={!!quercus}
        onQuercus={openQuercus}
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
            <button type="button" className="btn-plain hero-back" style={{ display: 'inline-flex' }} onClick={() => updateLocal((s) => setCurrentFolder(s, backTarget))}>
              <Icon name="arrow-back-outline" /> {backTarget ? 'Back to parent folder' : 'Back to all courses'}
            </button>
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
                message: 'Your Quercus deadlines will be removed from this device. Your courses and grades are not affected.',
                confirmText: 'Disconnect',
                confirmTone: 'danger',
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
