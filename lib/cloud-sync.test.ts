import { describe, expect, it } from 'vitest';
import { markSynced, mergeRemote, type CloudCourseRow, type CloudFolderRow } from './cloud-sync';
import { emptyState } from './semester';
import type { Course, Folder, SemesterState } from './types';

const T1 = '2026-10-01T00:00:00.000Z';
const T2 = '2026-10-02T00:00:00.000Z';
const NOW = '2026-10-20T00:00:00.000Z';

const course = (id: string, overrides: Partial<Course> = {}): Course => ({
  id,
  code: id.toUpperCase(),
  title: '',
  icon: 'book-outline',
  grade: null,
  crncr: false,
  folderId: null,
  assessments: [],
  updatedAt: T1,
  ...overrides,
});

const row = (id: string, overrides: Partial<CloudCourseRow> = {}): CloudCourseRow => ({
  user_id: 'u',
  course_id: id,
  code: id.toUpperCase(),
  title: '',
  icon: 'book-outline',
  grade: null,
  crncr: false,
  weights: [],
  updated_at: T1,
  folder_id: null,
  position: 0,
  ...overrides,
});

const folderRow = (id: string, overrides: Partial<CloudFolderRow> = {}): CloudFolderRow => ({
  user_id: 'u',
  folder_id: id,
  name: id,
  parent_folder_id: null,
  updated_at: T1,
  ...overrides,
});

const folder = (id: string, overrides: Partial<Folder> = {}): Folder => ({
  id,
  name: id,
  parentFolderId: null,
  updatedAt: T1,
  ...overrides,
});

const withState = (patch: Partial<SemesterState>): SemesterState => ({ ...emptyState(), ...patch });

describe('mergeRemote', () => {
  it('uploads two courses with the same code as separate rows', () => {
    const local = withState({ courses: [course('a', { code: 'CSC108' }), course('b', { code: 'CSC108' })] });
    const result = mergeRemote(local, { courses: [], folders: [] }, NOW);
    expect(result.uploadCourseIds).toEqual(['a', 'b']);
  });

  it('takes the newer side per course', () => {
    const local = withState({
      courses: [course('a', { title: 'local', updatedAt: T2 }), course('b', { title: 'local', updatedAt: T1 })],
      sync: { ...emptyState().sync, syncedCourseIds: ['a', 'b'] },
    });
    const result = mergeRemote(local, {
      courses: [row('a', { title: 'remote', updated_at: T1 }), row('b', { title: 'remote', updated_at: T2 })],
      folders: [],
    });
    expect(result.state.courses.map((c) => c.title)).toEqual(['local', 'remote']);
    expect(result.uploadCourseIds).toEqual(['a']);
  });

  it('does not re-upload a course another device deleted', () => {
    const local = withState({
      courses: [course('gone'), course('kept')],
      sync: { ...emptyState().sync, syncedCourseIds: ['gone', 'kept'] },
    });
    const result = mergeRemote(local, { courses: [row('kept')], folders: [] });
    expect(result.state.courses.map((c) => c.id)).toEqual(['kept']);
    expect(result.uploadCourseIds).toEqual([]);
  });

  it('adds courses created on another device', () => {
    const result = mergeRemote(withState({}), {
      courses: [row('b', { position: 1 }), row('a', { position: 0 })],
      folders: [],
    });
    expect(result.state.courses.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('sends queued deletes and does not resurrect them', () => {
    const local = withState({ sync: { ...emptyState().sync, pendingCourseDeletes: ['x'] } });
    const result = mergeRemote(local, { courses: [row('x')], folders: [] });
    expect(result.state.courses).toEqual([]);
    expect(result.deleteCourseIds).toEqual(['x']);
  });

  it('adopts rows the old site keyed by course code instead of duplicating them', () => {
    const local = withState({ courses: [course('k3j9x', { code: 'MAT137', updatedAt: '' })] });
    const result = mergeRemote(local, { courses: [row('MAT137', { code: 'MAT137' })], folders: null }, NOW);
    expect(result.state.courses.map((c) => c.id)).toEqual(['MAT137']);
    expect(result.uploadCourseIds).toEqual(['MAT137']);
    expect(result.state.courses[0].updatedAt).toBe(NOW);
  });

  it('lets un-timestamped local data win once (old behaviour)', () => {
    const local = withState({ courses: [course('a', { title: 'mine', updatedAt: '' })] });
    const result = mergeRemote(local, { courses: [row('a', { title: 'cloud', updated_at: T2 })], folders: null }, NOW);
    expect(result.state.courses[0].title).toBe('mine');
    expect(result.uploadCourseIds).toEqual(['a']);
  });

  it('keeps local folder placement when the backend has no folder support', () => {
    const local = withState({
      courses: [course('a', { folderId: 'f', updatedAt: T1 })],
      folders: [folder('f')],
    });
    const result = mergeRemote(local, { courses: [row('a', { updated_at: T2 })], folders: null });
    expect(result.state.courses[0].folderId).toBe('f');
    expect(result.state.folders).toEqual(local.folders);
    expect(result.uploadFolderIds).toEqual([]);
  });

  it('syncs folders both ways when supported', () => {
    const local = withState({
      folders: [folder('mine', { updatedAt: T2 }), folder('deletedElsewhere')],
      sync: { ...emptyState().sync, syncedFolderIds: ['deletedElsewhere'] },
    });
    const result = mergeRemote(local, { courses: [row('a', { folder_id: 'theirs' })], folders: [folderRow('theirs')] });
    expect(result.state.folders.map((f) => f.id).sort()).toEqual(['mine', 'theirs']);
    expect(result.uploadFolderIds).toEqual(['mine']);
    expect(result.state.courses[0].folderId).toBe('theirs');
  });

  it('restores assessments from the cloud on a new device', () => {
    const weights = [{ name: 'Midterm', weight: 30, grade: 77 }];
    const result = mergeRemote(withState({}), { courses: [row('a', { weights })], folders: [] });
    expect(result.state.courses[0].assessments).toEqual([expect.objectContaining({ name: 'Midterm', weight: 30, grade: 77, estimate: null })]);
  });
});

describe('markSynced', () => {
  it('records synced ids without losing edits made during the push', () => {
    const local = withState({ courses: [course('a')], sync: { ...emptyState().sync, pendingCourseDeletes: ['old'] } });
    const result = mergeRemote(local, { courses: [], folders: [] });
    const latest = withState({
      courses: [course('a'), course('addedDuringPush')],
      sync: { ...local.sync, pendingCourseDeletes: ['old', 'deletedDuringPush'] },
    });
    const next = markSynced(latest, result, true);
    expect(next.courses.map((c) => c.id)).toEqual(['a', 'addedDuringPush']);
    expect(next.sync.syncedCourseIds).toEqual(['a']);
    expect(next.sync.pendingCourseDeletes).toEqual(['deletedDuringPush']);
  });
});
