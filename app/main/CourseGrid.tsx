'use client';

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { courseGrade, letterFromPct, type UniversityRules } from '@/lib/grading';
import type { NextDeadline } from '@/lib/quercus';
import type { Course, Folder, SemesterState } from '@/lib/types';

const DRAG_TYPE = 'application/x-mysemester-item';
const LONG_PRESS_MS = 520;
const MOVE_TOLERANCE_PX = 10;

type DragPayload = { kind: 'course' | 'folder'; id: string };

function readDrag(e: DragEvent): DragPayload | null {
  try {
    const parsed = JSON.parse(e.dataTransfer.getData(DRAG_TYPE) || 'null');
    if (parsed && (parsed.kind === 'course' || parsed.kind === 'folder') && typeof parsed.id === 'string') return parsed;
  } catch {
    // not ours
  }
  return null;
}

function writeDrag(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData('text/plain', payload.id);
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

/** Plays the entrance animation once when a card mounts. */
function useEntrance(index: number) {
  const [entering, setEntering] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return {
    className: entering ? ' card-enter' : '',
    style: entering ? ({ '--card-enter-delay': `${Math.min(index * 36, 220)}ms` } as React.CSSProperties) : undefined,
    onAnimationEnd: () => setEntering(false),
  };
}

/** Alternates between percent and letter every six seconds, with a fade. */
function GradeMark({ pct, showLetter }: { pct: number | null; showLetter: boolean }) {
  const [showingLetter, setShowingLetter] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (pct == null || !showLetter) return;
    let fadeTimer = 0;
    const id = window.setInterval(() => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        setShowingLetter((s) => !s);
        setFading(false);
      }, 300);
    }, 6000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimer);
    };
  }, [pct, showLetter]);

  const text = pct == null ? '—' : showLetter && showingLetter ? letterFromPct(pct) : `${Math.round(pct)}%`;
  return (
    <div className="mark">
      <span className="swap" style={{ opacity: fading ? 0 : 1 }}>
        {text}
      </span>
    </div>
  );
}

/** Long-press on touch screens opens the context menu; the click that follows is swallowed. */
function useLongPress(onLongPress: (x: number, y: number) => void) {
  const timer = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef(0);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      clear();
      timer.current = window.setTimeout(() => {
        last.current = Date.now();
        onLongPress(start.current.x, start.current.y);
      }, LONG_PRESS_MS);
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!timer.current || !e.touches.length) return;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      const dy = Math.abs(e.touches[0].clientY - start.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clear();
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
    onClickCapture: (e: React.MouseEvent) => {
      if (Date.now() - last.current < 700) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}

interface CardHandlers {
  onOpenCourse: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onCourseMenu: (x: number, y: number, id: string) => void;
  onFolderMenu: (x: number, y: number, id: string) => void;
  onRenameFolder: (id: string) => void;
  onMoveCourse: (courseId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onAddCourse: () => void;
  onAddFolder: () => void;
}

function CourseCard({
  course,
  index,
  rules,
  highlighted,
  removing,
  next,
  handlers,
}: {
  course: Course;
  index: number;
  rules: UniversityRules;
  highlighted: boolean;
  removing: boolean;
  /** Most pressing Quercus deadline for this course, if connected. */
  next: NextDeadline | null;
  handlers: CardHandlers;
}) {
  const entrance = useEntrance(index);
  const longPress = useLongPress((x, y) => handlers.onCourseMenu(x, y, course.id));
  const credit = rules.creditAllowed && course.crncr;
  const pct = courseGrade(course);
  return (
    <div
      className={`card${highlighted ? ' card-pop' : ''}${removing ? ' fade-out' : ''}${entrance.className}`}
      style={entrance.style}
      onAnimationEnd={entrance.onAnimationEnd}
      data-id={course.id}
      draggable
      role="link"
      tabIndex={0}
      onClick={() => handlers.onOpenCourse(course.id)}
      onKeyDown={(e) => e.key === 'Enter' && handlers.onOpenCourse(course.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        handlers.onCourseMenu(e.clientX, e.clientY, course.id);
      }}
      onDragStart={(e) => writeDrag(e, { kind: 'course', id: course.id })}
      {...longPress}
    >
      <Icon className="course-icon" name={course.icon} />
      <div className="info">
        <div className="code-row">
          <div className="code">{course.code}</div>
          {credit && <span className="tag-crncr">{rules.creditLabel || 'CR/NCR'}</span>}
        </div>
        <div className="muted-sm">{course.title}</div>
        {next && (
          <div className={next.overdue ? 'card-next is-overdue' : 'card-next'} title={`${next.deadline.title} (from Quercus)`}>
            <Icon name={next.overdue ? 'alert-circle-outline' : 'time-outline'} />
            <span className="card-next-title">{next.deadline.title}</span>
            <span className="card-next-when">· {next.when}</span>
          </div>
        )}
      </div>
      <GradeMark pct={pct} showLetter={rules.showLetter} />
    </div>
  );
}

function FolderCard({
  folder,
  index,
  courseCount,
  folderCount,
  highlighted,
  isValidDrop,
  handlers,
}: {
  folder: Folder;
  index: number;
  courseCount: number;
  folderCount: number;
  highlighted: boolean;
  isValidDrop: (payload: DragPayload) => boolean;
  handlers: CardHandlers;
}) {
  const entrance = useEntrance(index);
  const [armedUntil, setArmedUntil] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const armTimer = useRef<number | null>(null);
  const press = useRef({ x: 0, y: 0 });
  const lastLongPress = useRef(0);

  // Folders become draggable only after a long press, so a quick click still opens them.
  const armed = armedUntil > 0;
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmedUntil(0), 1300);
    return () => window.clearTimeout(id);
  }, [armed, armedUntil]);

  const clearArm = () => {
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = null;
  };

  const courseText = `${courseCount} course${courseCount === 1 ? '' : 's'}`;
  const detail = folderCount > 0 ? `${courseText} · ${folderCount} folder${folderCount === 1 ? '' : 's'}` : courseText;

  return (
    <div
      className={`card folder-card${highlighted ? ' card-pop' : ''}${armed ? ' folder-drag-armed' : ''}${dragOver ? ' drag-over' : ''}${entrance.className}`}
      style={entrance.style}
      onAnimationEnd={entrance.onAnimationEnd}
      data-folder-id={folder.id}
      draggable={armed}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        press.current = { x: e.clientX, y: e.clientY };
        clearArm();
        armTimer.current = window.setTimeout(() => {
          armTimer.current = null;
          lastLongPress.current = Date.now();
          setArmedUntil(Date.now() + 1200);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (!armTimer.current) return;
        if (Math.abs(e.clientX - press.current.x) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - press.current.y) > MOVE_TOLERANCE_PX) clearArm();
      }}
      onPointerUp={clearArm}
      onPointerCancel={clearArm}
      onPointerLeave={clearArm}
      onClick={() => {
        if (Date.now() - lastLongPress.current < 700) return;
        handlers.onOpenFolder(folder.id);
      }}
      onKeyDown={(e) => e.key === 'Enter' && handlers.onOpenFolder(folder.id)}
      onDoubleClick={() => handlers.onRenameFolder(folder.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        handlers.onFolderMenu(e.clientX, e.clientY, folder.id);
      }}
      onDragStart={(e) => {
        if (Date.now() > armedUntil) {
          e.preventDefault();
          return;
        }
        writeDrag(e, { kind: 'folder', id: folder.id });
        setArmedUntil(0);
      }}
      onDragEnd={() => setArmedUntil(0)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const payload = readDrag(e);
        if (!payload || !isValidDrop(payload)) return;
        if (payload.kind === 'course') handlers.onMoveCourse(payload.id, folder.id);
        else handlers.onMoveFolder(payload.id, folder.id);
      }}
    >
      <Icon className="course-icon" name="folder-outline" />
      <div className="info">
        <div className="code">{folder.name}</div>
        <div className="muted-sm">{detail}</div>
        <div className="folder-hint">Click to open · Drag courses/folders here</div>
      </div>
      <span className="folder-badge">{courseCount + folderCount}</span>
    </div>
  );
}

function AddCard({ index, icon, title, subtitle, className, onClick }: { index: number; icon: string; title: string; subtitle: string; className: string; onClick: () => void }) {
  const entrance = useEntrance(index);
  return (
    <button type="button" className={`${className}${entrance.className}`} style={entrance.style} onAnimationEnd={entrance.onAnimationEnd} onClick={onClick}>
      <Icon className="course-icon" name={icon} />
      <div className="info">
        <div className="code">{title}</div>
        <div className="muted-sm">{subtitle}</div>
      </div>
    </button>
  );
}

interface CourseGridProps extends CardHandlers {
  state: SemesterState;
  rules: UniversityRules;
  highlightCourseId: string | null;
  highlightFolderId: string | null;
  removingId: string | null;
  /** Course id → its next Quercus deadline (empty when Quercus isn't connected). */
  nextDeadlines: ReadonlyMap<string, NextDeadline>;
}

export function CourseGrid({ state, rules, highlightCourseId, highlightFolderId, removingId, nextDeadlines, ...handlers }: CourseGridProps) {
  const current = state.currentFolderId;
  const inFolder = !!current;
  const isEmpty = !state.courses.length && !state.folders.length;

  const folders = state.folders
    .filter((f) => (f.parentFolderId ?? null) === (current ?? null))
    .sort((a, b) => a.name.localeCompare(b.name));
  const courses = state.courses.filter((c) => (inFolder ? c.folderId === current : !c.folderId));
  const folderIds = new Set(state.folders.map((f) => f.id));

  const isValidDropInto = (targetId: string) => (payload: DragPayload) => {
    if (payload.kind === 'course') return state.courses.some((c) => c.id === payload.id);
    if (!folderIds.has(payload.id) || payload.id === targetId) return false;
    // Moving a folder into its own descendant would create a loop.
    let cursor: Folder | undefined = state.folders.find((f) => f.id === targetId);
    while (cursor) {
      if (cursor.id === payload.id) return false;
      cursor = cursor.parentFolderId ? state.folders.find((f) => f.id === cursor!.parentFolderId) : undefined;
    }
    return true;
  };

  let content: ReactNode;
  if (isEmpty) {
    content = (
      <div className="empty-state-card">
        <div className="empty-icon">
          <Icon name="book-outline" />
        </div>
        <div className="empty-title">No courses yet</div>
        <div className="empty-desc">Start by adding your first course to track your grades!</div>
        <div className="empty-actions">
          <button type="button" className="btn-empty-pill" id="emptyAddCourseBtn" onClick={handlers.onAddCourse}>
            <Icon name="add-outline" /> Add Course
          </button>
          <button type="button" className="btn-empty-link" id="emptyAddFolderBtn" onClick={handlers.onAddFolder}>
            <Icon name="folder-outline" /> Create semester folder
          </button>
        </div>
      </div>
    );
  } else {
    let index = 0;
    content = (
      <>
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            index={index++}
            courseCount={state.courses.filter((c) => c.folderId === folder.id).length}
            folderCount={state.folders.filter((f) => f.parentFolderId === folder.id).length}
            highlighted={folder.id === highlightFolderId}
            isValidDrop={isValidDropInto(folder.id)}
            handlers={handlers}
          />
        ))}
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            index={index++}
            rules={rules}
            highlighted={course.id === highlightCourseId}
            removing={course.id === removingId}
            next={nextDeadlines.get(course.id) ?? null}
            handlers={handlers}
          />
        ))}
        {inFolder && !courses.length && !folders.length && (
          <div className="empty-state-card">
            <div className="empty-icon">
              <Icon name="folder-open-outline" />
            </div>
            <div className="empty-title">This folder is empty</div>
            <div className="empty-desc">Drag a course into the folder to get started.</div>
          </div>
        )}
        {!inFolder && (
          <AddCard index={index++} className="card add-course-card" icon="add-outline" title="Add Course" subtitle="Create another class" onClick={handlers.onAddCourse} />
        )}
        {!inFolder && !state.folders.length && (
          <AddCard
            index={index++}
            className="card add-course-card add-folder-card"
            icon="folder-outline"
            title="New Folder"
            subtitle="Group by semester"
            onClick={handlers.onAddFolder}
          />
        )}
      </>
    );
  }

  const gridEmpty = isEmpty || (inFolder && !courses.length && !folders.length);
  return (
    <section
      className={gridEmpty ? 'grid grid-empty' : 'grid'}
      id="courseGrid"
      // Remount on folder change so the entrance animation plays for the new view.
      key={current ?? 'root'}
      onDragOver={(e) => inFolder && e.preventDefault()}
      onDrop={(e) => {
        if (!inFolder) return;
        const payload = readDrag(e);
        if (!payload) return;
        // Dropping on the folder background moves the item out of this folder.
        if (payload.kind === 'course') handlers.onMoveCourse(payload.id, null);
        else handlers.onMoveFolder(payload.id, current);
      }}
    >
      {content}
    </section>
  );
}
