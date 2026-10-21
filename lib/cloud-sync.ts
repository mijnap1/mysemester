import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeAssessments, normalizeCode, nowIso, sanitizeIcon } from './semester';
import type { Course, Folder, SemesterState } from './types';

/**
 * Cloud sync for courses and folders.
 *
 * Rows are keyed by the course's id (not its code), so two courses can share
 * a code. Each sync fetches the user's rows, merges them with local state
 * (newest `updatedAt` wins per item), then pushes only what changed.
 *
 * Deletions: a local delete is queued in `sync.pendingCourseDeletes` and sent
 * on the next sync. An item that is missing remotely but was present at the
 * last successful sync was deleted on another device, so it is dropped
 * locally instead of being re-uploaded.
 *
 * Folder sync needs the columns/table from supabase/migrations. Until that
 * migration is applied, courses still sync and folders stay local.
 */

export const COURSES_TABLE = 'mysemester_courses';
export const FOLDERS_TABLE = 'mysemester_folders';

export interface CloudCourseRow {
  user_id: string;
  course_id: string;
  code: string;
  title: string | null;
  icon: string | null;
  grade: number | null;
  crncr: boolean | null;
  weights: unknown;
  updated_at: string | null;
  folder_id?: string | null;
  position?: number | null;
}

export interface CloudFolderRow {
  user_id: string;
  folder_id: string;
  name: string;
  parent_folder_id: string | null;
  updated_at: string | null;
}

export interface CloudCapabilities {
  folders: boolean;
}

export interface RemoteSnapshot {
  courses: CloudCourseRow[];
  /** null when the backend has no folder support yet. */
  folders: CloudFolderRow[] | null;
}

export interface MergeResult {
  /** Merged state. Its `sync` block is unchanged until the push succeeds. */
  state: SemesterState;
  uploadCourseIds: string[];
  uploadFolderIds: string[];
  deleteCourseIds: string[];
  deleteFolderIds: string[];
}

function finiteOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

function time(value: string | null | undefined): number {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) ? t : 0;
}

function courseFromRow(row: CloudCourseRow, local: Course | undefined, foldersSupported: boolean): Course {
  return {
    id: row.course_id,
    code: normalizeCode(row.code) || row.course_id,
    title: row.title ?? '',
    icon: sanitizeIcon(row.icon),
    grade: finiteOrNull(row.grade),
    crncr: row.crncr === true,
    folderId: foldersSupported ? row.folder_id ?? null : local?.folderId ?? null,
    assessments: Array.isArray(row.weights) ? normalizeAssessments(row.weights) : local?.assessments ?? [],
    updatedAt: row.updated_at ?? '',
  };
}

function folderFromRow(row: CloudFolderRow): Folder {
  return {
    id: row.folder_id,
    name: row.name,
    parentFolderId: row.parent_folder_id ?? null,
    updatedAt: row.updated_at ?? '',
  };
}

/**
 * Pick local or remote for an item present on both sides. Local items with no
 * timestamp predate this sync scheme; they win once, matching the old
 * "local first" behaviour, and get stamped on upload.
 */
function localWins(localUpdatedAt: string, remoteUpdatedAt: string | null): boolean | null {
  if (!localUpdatedAt) return true;
  const l = time(localUpdatedAt);
  const r = time(remoteUpdatedAt);
  if (l > r) return true;
  if (r > l) return false;
  return null; // identical: nothing to do
}

export function mergeRemote(local: SemesterState, remote: RemoteSnapshot, stamp = nowIso()): MergeResult {
  const foldersSupported = remote.folders !== null;
  const synced = new Set(local.sync.syncedCourseIds);
  const pendingDeletes = new Set(local.sync.pendingCourseDeletes);
  const remoteById = new Map(remote.courses.map((r) => [r.course_id, r]));

  // Rows written by the old site are keyed by course code. Adopt them onto the
  // matching local course (same code, never synced under ids) so the first
  // sync after upgrading does not duplicate every course.
  const localCourses = local.courses.map((c) => ({ ...c }));
  const localIds = new Set(localCourses.map((c) => c.id));
  for (const row of remote.courses) {
    if (localIds.has(row.course_id) || pendingDeletes.has(row.course_id)) continue;
    if (row.course_id !== normalizeCode(row.code)) continue;
    const match = localCourses.find(
      (c) => c.code === row.course_id && !remoteById.has(c.id) && !synced.has(c.id),
    );
    if (match) {
      localIds.delete(match.id);
      match.id = row.course_id;
      localIds.add(match.id);
    }
  }

  const uploadCourseIds: string[] = [];
  const courses: Course[] = [];
  for (const course of localCourses) {
    const row = remoteById.get(course.id);
    if (!row) {
      if (synced.has(course.id)) continue; // deleted on another device
      courses.push(course);
      uploadCourseIds.push(course.id);
      continue;
    }
    const winner = localWins(course.updatedAt, row.updated_at);
    if (winner === false) {
      courses.push(courseFromRow(row, course, foldersSupported));
    } else {
      courses.push(course);
      if (winner === true) uploadCourseIds.push(course.id);
    }
  }
  const remoteOnly = remote.courses
    .filter((row) => !localIds.has(row.course_id) && !pendingDeletes.has(row.course_id))
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.code.localeCompare(b.code));
  for (const row of remoteOnly) courses.push(courseFromRow(row, undefined, foldersSupported));

  let folders = local.folders;
  const uploadFolderIds: string[] = [];
  if (foldersSupported) {
    const syncedFolders = new Set(local.sync.syncedFolderIds);
    const pendingFolderDeletes = new Set(local.sync.pendingFolderDeletes);
    const remoteFolders = new Map(remote.folders!.map((r) => [r.folder_id, r]));
    folders = [];
    for (const folder of local.folders) {
      const row = remoteFolders.get(folder.id);
      if (!row) {
        if (syncedFolders.has(folder.id)) continue;
        folders.push(folder);
        uploadFolderIds.push(folder.id);
        continue;
      }
      const winner = localWins(folder.updatedAt, row.updated_at);
      if (winner === false) {
        folders.push(folderFromRow(row));
      } else {
        folders.push(folder);
        if (winner === true) uploadFolderIds.push(folder.id);
      }
    }
    const localFolderIds = new Set(local.folders.map((f) => f.id));
    for (const row of remote.folders!) {
      if (!localFolderIds.has(row.folder_id) && !pendingFolderDeletes.has(row.folder_id)) {
        folders.push(folderFromRow(row));
      }
    }
  }

  // Drop references to folders that no longer exist on either side.
  const folderIds = new Set(folders.map((f) => f.id));
  folders = folders.map((f) =>
    f.parentFolderId && !folderIds.has(f.parentFolderId) ? { ...f, parentFolderId: null } : f,
  );
  const finalCourses = courses.map((c) => (c.folderId && !folderIds.has(c.folderId) ? { ...c, folderId: null } : c));

  // Items uploaded for the first time under this scheme get a real timestamp.
  const uploadCourseSet = new Set(uploadCourseIds);
  const uploadFolderSet = new Set(uploadFolderIds);
  const stamped = finalCourses.map((c) => (uploadCourseSet.has(c.id) && !c.updatedAt ? { ...c, updatedAt: stamp } : c));
  const stampedFolders = folders.map((f) => (uploadFolderSet.has(f.id) && !f.updatedAt ? { ...f, updatedAt: stamp } : f));

  return {
    state: {
      ...local,
      courses: stamped,
      folders: stampedFolders,
      currentFolderId: local.currentFolderId && folderIds.has(local.currentFolderId) ? local.currentFolderId : null,
    },
    uploadCourseIds,
    uploadFolderIds,
    deleteCourseIds: [...local.sync.pendingCourseDeletes],
    deleteFolderIds: foldersSupported ? [...local.sync.pendingFolderDeletes] : [],
  };
}

/**
 * After a successful push, record what the cloud now holds. Applied to the
 * latest local state, so edits made while the request was in flight survive.
 */
export function markSynced(latest: SemesterState, result: MergeResult, foldersSupported: boolean): SemesterState {
  const deletedCourses = new Set(result.deleteCourseIds);
  const deletedFolders = new Set(result.deleteFolderIds);
  return {
    ...latest,
    sync: {
      syncedCourseIds: result.state.courses.map((c) => c.id),
      syncedFolderIds: foldersSupported ? result.state.folders.map((f) => f.id) : latest.sync.syncedFolderIds,
      pendingCourseDeletes: latest.sync.pendingCourseDeletes.filter((id) => !deletedCourses.has(id)),
      pendingFolderDeletes: latest.sync.pendingFolderDeletes.filter((id) => !deletedFolders.has(id)),
    },
  };
}

export function toCourseRow(course: Course, userId: string, position: number, caps: CloudCapabilities): CloudCourseRow {
  const row: CloudCourseRow = {
    user_id: userId,
    course_id: course.id,
    code: course.code,
    title: course.title,
    icon: course.icon,
    grade: course.grade,
    crncr: course.crncr,
    weights: course.assessments,
    updated_at: course.updatedAt,
  };
  if (caps.folders) {
    row.folder_id = course.folderId;
    row.position = position;
  }
  return row;
}

export function toFolderRow(folder: Folder, userId: string): CloudFolderRow {
  return {
    user_id: userId,
    folder_id: folder.id,
    name: folder.name,
    parent_folder_id: folder.parentFolderId,
    updated_at: folder.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Network side.

export async function detectCapabilities(client: SupabaseClient): Promise<CloudCapabilities> {
  const [courseCols, folderTable] = await Promise.all([
    client.from(COURSES_TABLE).select('folder_id, position').limit(1),
    client.from(FOLDERS_TABLE).select('folder_id').limit(1),
  ]);
  return { folders: !courseCols.error && !folderTable.error };
}

export async function fetchRemote(client: SupabaseClient, userId: string, caps: CloudCapabilities): Promise<RemoteSnapshot> {
  const columns = caps.folders
    ? 'user_id, course_id, code, title, icon, grade, crncr, weights, updated_at, folder_id, position'
    : 'user_id, course_id, code, title, icon, grade, crncr, weights, updated_at';
  const coursesQuery = client.from(COURSES_TABLE).select(columns).eq('user_id', userId);
  const foldersQuery = caps.folders
    ? client.from(FOLDERS_TABLE).select('user_id, folder_id, name, parent_folder_id, updated_at').eq('user_id', userId)
    : null;
  const [courses, folders] = await Promise.all([coursesQuery, foldersQuery]);
  if (courses.error) throw courses.error;
  if (folders?.error) throw folders.error;
  return {
    courses: (courses.data ?? []) as unknown as CloudCourseRow[],
    folders: folders ? ((folders.data ?? []) as unknown as CloudFolderRow[]) : null,
  };
}

export async function pushChanges(
  client: SupabaseClient,
  userId: string,
  result: MergeResult,
  caps: CloudCapabilities,
): Promise<void> {
  const { state } = result;
  if (caps.folders) {
    const uploadFolders = new Set(result.uploadFolderIds);
    const folderRows = state.folders.filter((f) => uploadFolders.has(f.id)).map((f) => toFolderRow(f, userId));
    if (folderRows.length) {
      const { error } = await client.from(FOLDERS_TABLE).upsert(folderRows, { onConflict: 'user_id,folder_id' });
      if (error) throw error;
    }
  }

  const uploadCourses = new Set(result.uploadCourseIds);
  const courseRows = state.courses
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => uploadCourses.has(c.id))
    .map(({ c, index }) => toCourseRow(c, userId, index, caps));
  if (courseRows.length) {
    const { error } = await client.from(COURSES_TABLE).upsert(courseRows, { onConflict: 'user_id,course_id' });
    if (error) throw error;
  }

  if (result.deleteCourseIds.length) {
    const { error } = await client
      .from(COURSES_TABLE)
      .delete()
      .eq('user_id', userId)
      .in('course_id', result.deleteCourseIds);
    if (error) throw error;
  }
  if (caps.folders && result.deleteFolderIds.length) {
    const { error } = await client
      .from(FOLDERS_TABLE)
      .delete()
      .eq('user_id', userId)
      .in('folder_id', result.deleteFolderIds);
    if (error) throw error;
  }
}
