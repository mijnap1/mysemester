import { describe, expect, it } from 'vitest';
import {
  addCourse,
  addFolder,
  deleteFolder,
  emptyState,
  moveFolder,
  normalizeState,
  removeCourse,
  replaceCourses,
  restoreCourse,
  sanitizeIcon,
} from './semester';

describe('normalizeState (loading old data)', () => {
  it('moves legacy assessments into the course and keeps ids', () => {
    const state = normalizeState(
      { courses: [{ id: 'CSC108', code: 'csc108', title: 'Intro', icon: 'laptop-outline', grade: 80 }] },
      { legacyAssessments: (code) => (code === 'CSC108' ? [{ name: 'Quiz', weight: 10, grade: 90 }] : null) },
    );
    expect(state.version).toBe(6);
    expect(state.courses[0]).toMatchObject({
      id: 'CSC108',
      code: 'CSC108',
      icon: 'laptop-outline',
      folderId: null,
      assessments: [{ name: 'Quiz', weight: 10, grade: 90, estimate: null }],
      updatedAt: '',
    });
  });

  it('gives legacy rows to only the first course with a code', () => {
    const state = normalizeState(
      { courses: [{ id: 'a', code: 'MAT137' }, { id: 'b', code: 'MAT137' }] },
      { legacyAssessments: () => [{ name: 'PS1', weight: 5, grade: 100 }] },
    );
    expect(state.courses[0].assessments).toHaveLength(1);
    expect(state.courses[1].assessments).toHaveLength(0);
  });

  it('re-ids duplicate ids and drops dangling folder references', () => {
    const state = normalizeState({
      courses: [{ id: 'x', code: 'A' }, { id: 'x', code: 'B', folderId: 'missing' }],
      folders: [{ id: 'f1', name: 'Fall', parentFolderId: 'gone' }],
      currentFolderId: 'gone',
    });
    expect(state.courses[0].id).not.toBe(state.courses[1].id);
    expect(state.courses[1].folderId).toBeNull();
    expect(state.folders[0].parentFolderId).toBeNull();
    expect(state.currentFolderId).toBeNull();
  });

  it('breaks folder cycles', () => {
    const state = normalizeState({
      folders: [
        { id: 'a', name: 'A', parentFolderId: 'b' },
        { id: 'b', name: 'B', parentFolderId: 'a' },
      ],
    });
    expect(state.folders.some((f) => f.parentFolderId === null)).toBe(true);
  });

  it('treats the old "0 means no grade" import value as null', () => {
    expect(normalizeState({ courses: [{ code: 'A', grade: 0 }] }).courses[0].grade).toBeNull();
    expect(normalizeState({ version: 6, courses: [{ code: 'A', grade: 0 }] }).courses[0].grade).toBe(0);
  });

  it('survives garbage', () => {
    expect(normalizeState(null).courses).toEqual([]);
    expect(normalizeState({ courses: 'nope', folders: [null] }).folders).toHaveLength(1);
  });
});

describe('sanitizeIcon', () => {
  it('rejects anything that is not an icon name', () => {
    expect(sanitizeIcon('planet-outline')).toBe('planet-outline');
    expect(sanitizeIcon('"><img src=x onerror=alert(1)>')).toBe('book-outline');
  });
});

describe('mutations', () => {
  it('allows two courses with the same code', () => {
    let { state } = addCourse(emptyState(), { code: 'csc108', title: '', icon: 'book-outline', grade: null });
    ({ state } = addCourse(state, { code: 'CSC108', title: 'Retake', icon: 'book-outline', grade: null }));
    expect(state.courses.map((c) => c.code)).toEqual(['CSC108', 'CSC108']);
    expect(new Set(state.courses.map((c) => c.id)).size).toBe(2);
  });

  it('queues a cloud delete on remove and cancels it on undo', () => {
    const added = addCourse(emptyState(), { code: 'A', title: '', icon: 'book-outline', grade: null });
    const removed = removeCourse(added.state, added.id);
    expect(removed.state.sync.pendingCourseDeletes).toEqual([added.id]);
    const restored = restoreCourse(removed.state, removed.removed!, removed.index);
    expect(restored.courses).toHaveLength(1);
    expect(restored.sync.pendingCourseDeletes).toEqual([]);
  });

  it('deleting a folder lifts its children and unfiles its courses', () => {
    let s = emptyState();
    const parent = addFolder(s, 'Year 1', null);
    const child = addFolder(parent.state, 'Fall', parent.id);
    s = addCourse(child.state, { code: 'A', title: '', icon: 'book-outline', grade: null }, parent.id).state;
    s = deleteFolder(s, parent.id);
    expect(s.folders).toEqual([expect.objectContaining({ id: child.id, parentFolderId: null })]);
    expect(s.courses[0].folderId).toBeNull();
    expect(s.sync.pendingFolderDeletes).toEqual([parent.id]);
  });

  it('refuses to move a folder into its own subtree', () => {
    const a = addFolder(emptyState(), 'A', null);
    const b = addFolder(a.state, 'B', a.id);
    expect(moveFolder(b.state, a.id, b.id)).toBe(b.state);
  });

  it('import queues deletes for courses it replaces', () => {
    const a = addCourse(emptyState(), { code: 'A', title: '', icon: 'book-outline', grade: null });
    const s = replaceCourses(a.state, []);
    expect(s.sync.pendingCourseDeletes).toEqual([a.id]);
  });
});
