import { describe, expect, it } from 'vitest';
import { applyBulkCsv, buildExport, parseCsvLine, parseImport } from './import-export';
import { addCourse, addFolder, emptyState, setAssessments } from './semester';

describe('export → import round trip', () => {
  it('keeps courses, assessments, and folders', () => {
    const f = addFolder(emptyState(), 'Fall', null);
    const c = addCourse(f.state, { code: 'CSC108', title: 'Intro', icon: 'laptop-outline', grade: null }, f.id);
    const s = setAssessments(c.state, c.id, [{ id: 'q1', name: 'Quiz', weight: 10, grade: 90, estimate: null }]);
    const parsed = parseImport(JSON.stringify(buildExport(s)))!;
    expect(parsed.courses[0]).toMatchObject({ id: c.id, code: 'CSC108', folderId: f.id, assessments: [{ name: 'Quiz' }] });
    expect(parsed.folders).toEqual([expect.objectContaining({ id: f.id, name: 'Fall' })]);
  });
});

describe('parseImport', () => {
  it('reads old v2 files (weights, no folders)', () => {
    const parsed = parseImport(
      JSON.stringify({ version: 2, courses: [{ id: 'x', code: 'mat137', grade: 'abc', weights: [{ name: 'PS', weight: 5, grade: 80 }] }] }),
    )!;
    expect(parsed.folders).toBeNull();
    expect(parsed.courses[0]).toMatchObject({ code: 'MAT137', icon: 'calculator-outline', grade: null, folderId: null });
    expect(parsed.courses[0].assessments).toHaveLength(1);
  });

  it('neutralizes markup in a hostile file', () => {
    const parsed = parseImport(
      JSON.stringify({ courses: [{ code: '<img src=x onerror=alert(1)>', icon: '"><script>', title: '<b>t</b>' }] }),
    )!;
    // Text stays text (React escapes it); attributes are restricted to safe values.
    expect(parsed.courses[0].icon).toBe('book-outline');
    expect(parsed.courses[0].title).toBe('<b>t</b>');
  });

  it('returns null for non-export JSON and throws for invalid JSON', () => {
    expect(parseImport('{"hello":1}')).toBeNull();
    expect(() => parseImport('not json')).toThrow();
  });
});

describe('CSV bulk import', () => {
  it('parses quoted fields', () => {
    expect(parseCsvLine('CSC108,"Intro, CS",84,"say ""hi""",Fall')).toEqual(['CSC108', 'Intro, CS', '84', 'say "hi"', 'Fall']);
  });

  it('skips a header and existing codes, creates folders by name', () => {
    const existing = addCourse(emptyState(), { code: 'CSC108', title: '', icon: 'book-outline', grade: null }).state;
    const result = applyBulkCsv(existing, 'code,title,grade,icon,folder\nCSC108,dup\nMAT137,Calc,91,,Fall 2026\nSTA130,,,,fall 2026');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.state.folders).toHaveLength(1);
    expect(result.state.courses.find((c) => c.code === 'MAT137')).toMatchObject({ grade: 91, icon: 'calculator-outline' });
  });

  it('reports when nothing was imported', () => {
    expect(applyBulkCsv(emptyState(), '   ')).toEqual({ ok: false, error: 'Paste CSV rows to import.' });
    expect(applyBulkCsv(emptyState(), 'code,title')).toEqual({ ok: false, error: 'No data rows found after header.' });
  });
});
