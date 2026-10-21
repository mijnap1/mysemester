import { autoIcon } from './icons';
import { newId, normalizeAssessments, normalizeCode, normalizeState, nowIso, sanitizeIcon } from './semester';
import type { Course, Folder, SemesterState } from './types';

/**
 * Export format v3. Courses keep a `weights` array (the name the old site's
 * importer expects) so files stay loadable by older versions.
 */
export function buildExport(state: SemesterState) {
  return {
    version: 3,
    exportedAt: nowIso(),
    courses: state.courses.map(({ assessments, ...course }) => ({
      ...course,
      weights: assessments.length ? assessments : null,
    })),
    folders: state.folders,
  };
}

export interface ParsedImport {
  courses: Course[];
  /** Present only when the file included folders (v3 exports). */
  folders: Folder[] | null;
}

/**
 * Parse an export file (any version) into courses. Everything is normalized,
 * so a hand-edited or hostile file can only ever produce plain data.
 * Throws on unreadable JSON; returns null when the shape is not an export.
 */
export function parseImport(text: string): ParsedImport | null {
  const parsed: unknown = JSON.parse(text);
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const rawCourses = Array.isArray(root.courses) ? root.courses : Array.isArray(parsed) ? parsed : null;
  if (!rawCourses) return null;

  const hasFolders = Array.isArray(root.folders);
  const normalized = normalizeState({
    version: 6,
    folders: hasFolders ? root.folders : [],
    courses: rawCourses.map((item) => {
      const c = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const code = normalizeCode(c.code) || 'COURSE';
      return {
        ...c,
        code,
        icon: c.icon ? sanitizeIcon(c.icon) : autoIcon(code),
        assessments: normalizeAssessments(Array.isArray(c.assessments) ? c.assessments : c.weights),
        folderId: hasFolders ? c.folderId : null,
      };
    }),
  });

  // Stamp everything as just edited so the import wins over older cloud copies.
  const stamp = nowIso();
  return {
    courses: normalized.courses.map((c) => ({ ...c, updatedAt: stamp })),
    folders: hasFolders ? normalized.folders.map((f) => ({ ...f, updatedAt: stamp })) : null,
  };
}

/** Split one CSV line, honouring "quoted, values" and "" escapes. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export type BulkImportResult =
  | { ok: true; state: SemesterState; imported: number; skipped: number; firstCourseId: string | null; firstFolderId: string | null }
  | { ok: false; error: string };

/**
 * Add courses from pasted CSV (code,title,grade,icon,folder). Codes already on
 * the dashboard are skipped, as before; folders are created by name as needed.
 */
export function applyBulkCsv(state: SemesterState, raw: string): BulkImportResult {
  const lines = raw.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, error: 'Paste CSV rows to import.' };

  let rows = lines;
  if ((parseCsvLine(lines[0])[0] ?? '').toLowerCase() === 'code') rows = lines.slice(1);
  if (!rows.length) return { ok: false, error: 'No data rows found after header.' };

  const folders = [...state.folders];
  const courses = [...state.courses];
  const folderByName = new Map(folders.map((f) => [f.name.toLowerCase(), f.id]));
  const existingCodes = new Set(courses.map((c) => c.code));
  let imported = 0;
  let skipped = 0;
  let firstCourseId: string | null = null;
  let firstFolderId: string | null = null;
  const stamp = nowIso();

  for (const line of rows) {
    const [codeRaw = '', title = '', gradeRaw = '', iconRaw = '', folderName = ''] = parseCsvLine(line);
    const code = normalizeCode(codeRaw);
    if (!code || existingCodes.has(code)) {
      skipped += 1;
      continue;
    }

    let folderId: string | null = null;
    if (folderName) {
      const key = folderName.toLowerCase();
      folderId = folderByName.get(key) ?? null;
      if (!folderId) {
        folderId = newId();
        folders.push({ id: folderId, name: folderName, parentFolderId: null, updatedAt: stamp });
        folderByName.set(key, folderId);
        firstFolderId ??= folderId;
      }
    }

    const grade = gradeRaw === '' ? null : Number(gradeRaw);
    const id = newId();
    courses.push({
      id,
      code,
      title,
      icon: autoIcon(code, iconRaw ? sanitizeIcon(iconRaw) : undefined),
      grade: grade != null && Number.isFinite(grade) ? Math.max(0, Math.min(100, grade)) : null,
      crncr: false,
      folderId,
      assessments: [],
      updatedAt: stamp,
    });
    firstCourseId ??= id;
    existingCodes.add(code);
    imported += 1;
  }

  if (!imported) return { ok: false, error: 'No new courses imported. Check duplicates and CSV format.' };
  return { ok: true, state: { ...state, courses, folders }, imported, skipped, firstCourseId, firstFolderId };
}
