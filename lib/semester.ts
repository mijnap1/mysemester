import { KEYS, readJson, readString, writeJson } from './storage';
import type { Assessment, AuthState, Course, Folder, SemesterState, SyncMeta } from './types';

export const DEFAULT_ICON = 'book-outline';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptySyncMeta(): SyncMeta {
  return { syncedCourseIds: [], syncedFolderIds: [], pendingCourseDeletes: [], pendingFolderDeletes: [] };
}

export function emptyState(): SemesterState {
  return { version: 6, courses: [], folders: [], currentFolderId: null, sync: emptySyncMeta() };
}

/** Same per-user key the static site used, so existing data loads as-is. */
export function stateKey(auth: AuthState): string {
  return auth.loggedIn && auth.username ? `${KEYS.semesterBase}-${auth.username}` : KEYS.semesterBase;
}

export function storageUser(auth: AuthState): string {
  return auth.loggedIn && auth.username ? auth.username : 'guest';
}

// ---------------------------------------------------------------------------
// Normalization: turn anything found in storage, an import file, or the cloud
// into a well-formed value. Nothing downstream re-checks shapes.

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function finiteOrNull(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function clampPct(value: number | null): number | null {
  return value == null ? null : Math.max(0, Math.min(100, value));
}

/** Icon names come from a fixed picker, but imports can contain anything. */
export function sanitizeIcon(value: unknown): string {
  const icon = str(value).trim();
  return /^[a-z0-9-]{1,40}$/.test(icon) ? icon : DEFAULT_ICON;
}

export function normalizeCode(value: unknown): string {
  return str(value).trim().toUpperCase();
}

export function normalizeAssessment(raw: unknown, index: number): Assessment {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const weight = finiteOrNull(r.weight);
  return {
    name: str(r.name).trim() || `Assessment ${index + 1}`,
    weight: weight == null ? 0 : Math.max(0, Math.min(100, weight)),
    grade: clampPct(finiteOrNull(r.grade)),
    estimate: clampPct(finiteOrNull(r.estimate)),
  };
}

export function normalizeAssessments(raw: unknown): Assessment[] {
  return Array.isArray(raw) ? raw.map(normalizeAssessment) : [];
}

export interface NormalizeOptions {
  /** Pre-v6 assessments lived in separate keys; this looks them up by course code. */
  legacyAssessments?: (code: string) => Assessment[] | null;
}

export function normalizeState(raw: unknown, options: NormalizeOptions = {}): SemesterState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const isLegacy = r.version !== 6;

  const seenFolderIds = new Set<string>();
  const folders: Folder[] = [];
  for (const item of Array.isArray(r.folders) ? r.folders : []) {
    const f = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    let id = str(f.id);
    if (!id || seenFolderIds.has(id)) id = newId();
    seenFolderIds.add(id);
    folders.push({
      id,
      name: str(f.name).trim() || 'Untitled folder',
      parentFolderId: str(f.parentFolderId) || null,
      updatedAt: str(f.updatedAt),
    });
  }
  for (const folder of folders) {
    if (folder.parentFolderId && (!seenFolderIds.has(folder.parentFolderId) || folder.parentFolderId === folder.id)) {
      folder.parentFolderId = null;
    }
  }
  breakFolderCycles(folders);

  const claimedLegacyCodes = new Set<string>();
  const seenCourseIds = new Set<string>();
  const courses: Course[] = [];
  for (const item of Array.isArray(r.courses) ? r.courses : []) {
    const c = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    let id = str(c.id);
    if (!id || seenCourseIds.has(id)) id = newId();
    seenCourseIds.add(id);
    const code = normalizeCode(c.code) || normalizeCode(c.id) || 'COURSE';

    let assessments = normalizeAssessments(c.assessments);
    if (!Array.isArray(c.assessments) && options.legacyAssessments && !claimedLegacyCodes.has(code)) {
      // Legacy grade rows were keyed by code, so only the first course with a code can own them.
      assessments = (options.legacyAssessments(code) ?? []).map(normalizeAssessment);
      claimedLegacyCodes.add(code);
    }

    let grade = clampPct(finiteOrNull(c.grade));
    // The old dashboard stored 0 for "no grade" when an import had none.
    if (isLegacy && grade === 0 && assessments.length === 0) grade = null;

    const folderId = str(c.folderId) || null;
    courses.push({
      id,
      code,
      title: str(c.title),
      icon: sanitizeIcon(c.icon),
      grade,
      crncr: c.crncr === true,
      folderId: folderId && seenFolderIds.has(folderId) ? folderId : null,
      assessments,
      updatedAt: str(c.updatedAt),
    });
  }

  const currentFolderId = str(r.currentFolderId) || null;
  const s = (r.sync && typeof r.sync === 'object' ? r.sync : {}) as Record<string, unknown>;
  const ids = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

  return {
    version: 6,
    courses,
    folders,
    currentFolderId: currentFolderId && seenFolderIds.has(currentFolderId) ? currentFolderId : null,
    sync: {
      syncedCourseIds: ids(s.syncedCourseIds),
      syncedFolderIds: ids(s.syncedFolderIds),
      pendingCourseDeletes: ids(s.pendingCourseDeletes),
      pendingFolderDeletes: ids(s.pendingFolderDeletes),
    },
  };
}

/** Detach any folder whose parent chain loops back to itself. */
function breakFolderCycles(folders: Folder[]): void {
  const byId = new Map(folders.map((f) => [f.id, f]));
  for (const folder of folders) {
    const seen = new Set<string>([folder.id]);
    let cursor = folder.parentFolderId ? byId.get(folder.parentFolderId) : undefined;
    while (cursor) {
      if (seen.has(cursor.id)) {
        folder.parentFolderId = null;
        break;
      }
      seen.add(cursor.id);
      cursor = cursor.parentFolderId ? byId.get(cursor.parentFolderId) : undefined;
    }
  }
}

export function loadState(auth: AuthState): SemesterState {
  const user = storageUser(auth);
  const raw = readJson<unknown>(stateKey(auth));
  return normalizeState(raw ?? {}, {
    legacyAssessments: (code) => {
      const rows = readJson<unknown>(KEYS.legacyGrades(user, code));
      return Array.isArray(rows) ? normalizeAssessments(rows) : null;
    },
  });
}

export function saveState(auth: AuthState, state: SemesterState): void {
  writeJson(stateKey(auth), state);
}

export function readAuth(): AuthState {
  const auth = readJson<AuthState>(KEYS.auth);
  return auth && auth.loggedIn ? auth : { loggedIn: false };
}

export function hasCompletedSetup(): boolean {
  const data = readJson<{ university?: string; year?: string; program?: string }>(KEYS.onboarding);
  return !!(data && data.university && data.year && data.program);
}

export function readUniversity(): string {
  return readJson<{ university?: string }>(KEYS.onboarding)?.university ?? '';
}

export function readEstimateTarget(): number {
  const direct = parseFloat(readString(KEYS.estimateTarget) ?? '');
  if (Number.isFinite(direct)) return direct;
  const settings = readJson<{ estimateTarget?: string }>(KEYS.settings);
  const fromSettings = parseFloat(settings?.estimateTarget ?? '');
  return Number.isFinite(fromSettings) ? fromSettings : 85;
}

// ---------------------------------------------------------------------------
// Mutations. Each returns a new state and stamps updatedAt on what it touched.

export interface CourseInput {
  code: string;
  title: string;
  icon: string;
  grade: number | null;
}

export function addCourse(state: SemesterState, input: CourseInput, folderId: string | null = null): { state: SemesterState; id: string } {
  const id = newId();
  const course: Course = {
    id,
    code: normalizeCode(input.code),
    title: input.title.trim(),
    icon: sanitizeIcon(input.icon),
    grade: clampPct(input.grade),
    crncr: false,
    folderId,
    assessments: [],
    updatedAt: nowIso(),
  };
  return { state: { ...state, courses: [...state.courses, course] }, id };
}

export function updateCourse(state: SemesterState, id: string, patch: Partial<Omit<Course, 'id' | 'updatedAt'>>): SemesterState {
  return {
    ...state,
    courses: state.courses.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch, updatedAt: nowIso() };
      if (patch.code !== undefined) next.code = normalizeCode(patch.code);
      if (patch.icon !== undefined) next.icon = sanitizeIcon(patch.icon);
      return next;
    }),
  };
}

export function removeCourse(state: SemesterState, id: string): { state: SemesterState; removed: Course | null; index: number } {
  const index = state.courses.findIndex((c) => c.id === id);
  if (index === -1) return { state, removed: null, index };
  const removed = state.courses[index];
  return {
    state: {
      ...state,
      courses: state.courses.filter((c) => c.id !== id),
      sync: { ...state.sync, pendingCourseDeletes: addUnique(state.sync.pendingCourseDeletes, id) },
    },
    removed,
    index,
  };
}

/** Undo a removal: put the course back where it was and cancel its cloud delete. */
export function restoreCourse(state: SemesterState, course: Course, index: number): SemesterState {
  const courses = state.courses.filter((c) => c.id !== course.id);
  courses.splice(Math.min(Math.max(index, 0), courses.length), 0, { ...course, updatedAt: nowIso() });
  return {
    ...state,
    courses,
    sync: { ...state.sync, pendingCourseDeletes: state.sync.pendingCourseDeletes.filter((x) => x !== course.id) },
  };
}

export function duplicateCourse(state: SemesterState, id: string): { state: SemesterState; id: string | null } {
  const source = state.courses.find((c) => c.id === id);
  if (!source) return { state, id: null };
  const copy: Course = {
    ...source,
    id: newId(),
    code: `${source.code} (COPY)`,
    assessments: source.assessments.map((a) => ({ ...a })),
    updatedAt: nowIso(),
  };
  return { state: { ...state, courses: [...state.courses, copy] }, id: copy.id };
}

export function setAssessments(state: SemesterState, id: string, assessments: Assessment[]): SemesterState {
  return updateCourse(state, id, { assessments });
}

export function folderNameTaken(state: SemesterState, name: string, exceptId?: string): boolean {
  const lower = name.trim().toLowerCase();
  return state.folders.some((f) => f.id !== exceptId && f.name.toLowerCase() === lower);
}

export function addFolder(state: SemesterState, name: string, parentFolderId: string | null): { state: SemesterState; id: string } {
  const id = newId();
  const folder: Folder = { id, name: name.trim(), parentFolderId, updatedAt: nowIso() };
  return { state: { ...state, folders: [...state.folders, folder] }, id };
}

export function renameFolder(state: SemesterState, id: string, name: string): SemesterState {
  return {
    ...state,
    folders: state.folders.map((f) => (f.id === id ? { ...f, name: name.trim(), updatedAt: nowIso() } : f)),
  };
}

/** Delete a folder; its child folders move up a level and its courses become unfiled. */
export function deleteFolder(state: SemesterState, id: string): SemesterState {
  const folder = state.folders.find((f) => f.id === id);
  if (!folder) return state;
  const parent = folder.parentFolderId;
  const stamp = nowIso();
  return {
    ...state,
    folders: state.folders
      .filter((f) => f.id !== id)
      .map((f) => (f.parentFolderId === id ? { ...f, parentFolderId: parent, updatedAt: stamp } : f)),
    courses: state.courses.map((c) => (c.folderId === id ? { ...c, folderId: null, updatedAt: stamp } : c)),
    currentFolderId: state.currentFolderId === id ? parent : state.currentFolderId,
    sync: { ...state.sync, pendingFolderDeletes: addUnique(state.sync.pendingFolderDeletes, id) },
  };
}

export function moveCourse(state: SemesterState, courseId: string, folderId: string | null): SemesterState {
  const course = state.courses.find((c) => c.id === courseId);
  if (!course || course.folderId === folderId) return state;
  return updateCourse(state, courseId, { folderId });
}

export function isFolderInSubtree(folders: Folder[], folderId: string, rootId: string): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cursor = byId.get(folderId);
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.id)) {
    if (cursor.id === rootId) return true;
    seen.add(cursor.id);
    cursor = cursor.parentFolderId ? byId.get(cursor.parentFolderId) : undefined;
  }
  return false;
}

/** Move a folder under another (or to the top level). Refuses moves that would create a cycle. */
export function moveFolder(state: SemesterState, folderId: string, parentId: string | null): SemesterState {
  if (folderId === parentId) return state;
  if (parentId && isFolderInSubtree(state.folders, parentId, folderId)) return state;
  return {
    ...state,
    folders: state.folders.map((f) => (f.id === folderId ? { ...f, parentFolderId: parentId, updatedAt: nowIso() } : f)),
  };
}

export function setCurrentFolder(state: SemesterState, folderId: string | null): SemesterState {
  return { ...state, currentFolderId: folderId };
}

/** Replace all courses (JSON import). Everything previously in the cloud gets deleted on next sync. */
export function replaceCourses(state: SemesterState, courses: Course[]): SemesterState {
  const nextIds = new Set(courses.map((c) => c.id));
  const dropped = state.courses.filter((c) => !nextIds.has(c.id)).map((c) => c.id);
  return {
    ...state,
    courses,
    sync: {
      ...state.sync,
      pendingCourseDeletes: dropped.reduce(addUnique, state.sync.pendingCourseDeletes),
    },
  };
}

/** Clear courses and folders but keep sync bookkeeping so the cloud copy is deleted too. */
export function resetState(state: SemesterState): SemesterState {
  return {
    ...emptyState(),
    sync: {
      ...state.sync,
      pendingCourseDeletes: state.courses.map((c) => c.id).reduce(addUnique, state.sync.pendingCourseDeletes),
      pendingFolderDeletes: state.folders.map((f) => f.id).reduce(addUnique, state.sync.pendingFolderDeletes),
    },
  };
}

function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}
