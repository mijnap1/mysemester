/**
 * Turning a syllabus into grade-page rows. The student uploads a PDF or pastes
 * text; /api/syllabus extracts the grading scheme and the student reviews it
 * before anything is saved. Nothing here keeps the syllabus.
 */

export interface SyllabusItem {
  name: string;
  /** Total percent for this component, e.g. 20 for "4 quizzes × 5%". */
  weight: number;
  /** How many separately graded pieces it has; 1 for a single exam. */
  count: number;
}

export interface SyllabusResult {
  items: SyllabusItem[];
  /** Rules that change how weights apply, e.g. "Best 4 of 5 quizzes count." */
  notes: string[];
  source: 'ai' | 'rules';
}

export const MAX_SYLLABUS_CHARS = 60_000;
export const MAX_SYLLABUS_FILE_BYTES = 4_000_000;
const MAX_ITEMS = 30;
const MAX_NOTES = 5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function itemsTotal(items: SyllabusItem[]): number {
  return round2(items.reduce((sum, i) => sum + i.weight, 0));
}

/** One grade-page row per graded piece: "Quiz" × 4 at 20% → "Quiz 1" … "Quiz 4" at 5% each. */
export function expandItems(items: SyllabusItem[]): { name: string; weight: number }[] {
  const rows: { name: string; weight: number }[] = [];
  for (const item of items) {
    if (item.count <= 1) {
      rows.push({ name: item.name, weight: round2(item.weight) });
      continue;
    }
    const each = round2(item.weight / item.count);
    for (let i = 1; i <= item.count; i++) {
      // The last piece absorbs rounding so the group still adds up.
      const weight = i === item.count ? round2(item.weight - each * (item.count - 1)) : each;
      rows.push({ name: `${singular(item.name)} ${i}`, weight });
    }
  }
  return rows;
}

function singular(name: string): string {
  if (/(ss|us|is)$/i.test(name)) return name;
  if (/ies$/i.test(name)) return name.replace(/ies$/i, 'y');
  if (/zzes$/i.test(name)) return name.replace(/zes$/i, '');
  if (/(ch|sh|x)es$/i.test(name)) return name.replace(/es$/i, '');
  return name.replace(/s$/i, '');
}

/** Validates loose JSON (from the model) into items; drops anything malformed. */
export function sanitizeItems(raw: unknown): SyllabusItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SyllabusItem[] = [];
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? cleanName(e.name) : '';
    const weight = Number(e.weight);
    const count = Math.round(Number(e.count ?? 1));
    if (!name || !Number.isFinite(weight) || weight <= 0 || weight > 100) continue;
    items.push({ name, weight: round2(weight), count: Number.isFinite(count) && count >= 1 && count <= MAX_ITEMS ? count : 1 });
  }
  return items;
}

export function sanitizeNotes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.replace(/\s+/g, ' ').trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_NOTES);
}

// ---------------------------------------------------------------------------
// Rule-based extraction. Works without AI for the usual "Midterm ... 25%" table.

const PCT = String.raw`(\d{1,3}(?:\.\d+)?)\s*%`;
/** "4 x 5%", "4 × 5%", "(4 @ 5%)" */
const TIMES = new RegExp(String.raw`(\d{1,2})\s*(?:x|×|@)\s*` + PCT, 'i');
/** "5 quizzes worth 2% each", "five labs, 3% each" */
const EACH = new RegExp(String.raw`\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b[^%\n]{0,40}?` + PCT + String.raw`\s*each`, 'i');
const WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

/** Lines that mention percentages but aren't grade components. */
const NOT_A_COMPONENT =
  /\b(late|penalt|deduct|per day|per hour|off the|grace|extension|curve|bell|scale|letter grade|GPA|attendance is|plagiar|similarity|turnitin|of the class|of students|discount)\b/i;
/** "A+ 90–100%", "80-84%": grading scales and ranges. */
const RANGE = /\d{1,3}(?:\.\d+)?\s*%?\s*(?:-|–|—|to)\s*\d{1,3}(?:\.\d+)?\s*%/i;
const LETTER_GRADE = /^\s*(?:[A-D][+-]?|F|E|CR|NCR)\b\s*[:=]?\s*\d/;

const NOTE_PATTERNS = [
  /\bbest\s+\d+\s+(?:out\s+)?of\s+\d+/i,
  /\b(?:lowest|worst)\b[^.]{0,60}\b(?:drop|dropped|not count|excluded)/i,
  /\bdrop(?:s|ped)?\s+(?:the|your)\s+lowest/i,
  /\b(?:transferred|shifted|re-?weight(?:ed)?|moved)\b[^.]{0,80}\b(?:final|exam|midterm|test)/i,
  /\bmust\s+(?:pass|obtain|achieve|get|score)\b[^.]{0,80}%?/i,
  /\bat\s+least\s+\d{1,3}\s*%\s+on\s+the\s+final/i,
  /\bwhichever\s+is\s+(?:higher|better|greater)/i,
  /\bbonus\b/i,
];

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';

const HEADING = /\b(grading|marking|evaluation|assessment|grade breakdown|course work|marks)\b/i;

function cleanName(raw: string): string {
  let name = raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s•●▪◦‣\-–—*·|:#\d.)(]+/, '')
    .replace(/[\s:=|–—\-,(]+$/, '')
    .replace(/\b(?:is|are)?\s*(?:worth|counts?\s+for|weighted\s+at|weight(?:ed)?|of\s+(?:the|your)\s+(?:final\s+)?(?:grade|mark))\s*$/i, '')
    .replace(/^(?:the|a|an|your)\s+/i, '')
    .replace(/\s*\(\s*$/, '')
    .trim();
  // Due dates and table columns between the name and the percent aren't part of the name.
  name = name
    .replace(/\s+(?:due|on|by)\s+.*$/i, '')
    .replace(new RegExp(String.raw`\s+(?:${MONTHS})\.?\s+\d{1,2}(?:st|nd|rd|th)?\b.*$`, 'i'), '')
    .replace(/\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b.*$/, '')
    .replace(new RegExp(String.raw`\s+(?:(?:${MONTHS})\s+)?(?:final\s+)?exam(?:ination)?\s+(?:period|week|session)\b.*$`, 'i'), '')
    .replace(/\s+(?:week\s+\d+|weekly|ongoing|tba|tbd|see quercus|in class|in lecture|in tutorial|(?:mon|tues|wednes|thurs|fri)days?)$/i, '')
    .trim();
  if (name.length > 60) name = name.slice(0, 60).replace(/\s+\S*$/, '');
  if (!/[a-z]/i.test(name)) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface Candidate extends SyllabusItem {
  line: number;
}

function candidatesFromLine(line: string, index: number): Candidate[] {
  if (!line.includes('%') || NOT_A_COMPONENT.test(line) || RANGE.test(line) || LETTER_GRADE.test(line)) return [];

  const times = line.match(TIMES);
  if (times && times.index !== undefined) {
    const count = Number(times[1]);
    const each = Number(times[2]);
    const name = cleanName(line.slice(0, times.index)) || cleanName(line.slice(times.index + times[0].length));
    return name && count >= 1 && each > 0 && count * each <= 100 ? [{ name, weight: round2(count * each), count, line: index }] : [];
  }

  const each = line.match(EACH);
  if (each && each.index !== undefined) {
    const count = WORDS[each[1].toLowerCase()] ?? Number(each[1]);
    const pct = Number(each[2]);
    // "There will be five quizzes worth 2% each" → "Quizzes"; "Labs: 10 × …" falls back to the label.
    const nounMatch = line.slice(each.index).match(/^\S+\s+([A-Za-z][A-Za-z -]{1,30}?)\s*(?:,|\s(?:worth|at|@|each|of|for|valued|weighted))/i);
    const name = cleanName(nounMatch?.[1] ?? '') || cleanName(line.slice(0, each.index));
    return name && count >= 1 && count * pct <= 100 ? [{ name, weight: round2(count * pct), count, line: index }] : [];
  }

  const out: Candidate[] = [];
  const pairs = new RegExp(String.raw`([^%\n]*?)` + PCT, 'g');
  let match: RegExpExecArray | null;
  while ((match = pairs.exec(line))) {
    const weight = Number(match[2]);
    let name = cleanName(match[1]);
    // "30% Final exam": the name follows the percent.
    if (!name && out.length === 0) {
      const after = line.slice(match.index + match[0].length).split(/\s{2,}|\d{1,3}\s*%/)[0];
      name = cleanName(after);
    }
    if (name && weight > 0 && weight <= 100) out.push({ name, weight, count: 1, line: index });
  }
  return out;
}

/**
 * Finds the grading scheme in plain syllabus text. Prefers a run of consecutive
 * components that adds up to 100%, nearest a "Grading"/"Evaluation" heading.
 */
export function parseSyllabusText(text: string): SyllabusResult {
  const lines = text
    .slice(0, MAX_SYLLABUS_CHARS)
    .replace(/ /g, ' ')
    .replace(/[‐‑‒]/g, '-')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim());

  const candidates = lines.flatMap(candidatesFromLine);
  const headingLines = lines.flatMap((l, i) => (HEADING.test(l) && l.length < 80 ? [i] : []));

  let best: Candidate[] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    let sum = 0;
    for (let j = i; j < candidates.length; j++) {
      sum = round2(sum + candidates[j].weight);
      if (sum > 100.5) break;
      if (sum >= 99.5 && j > i) {
        const run = candidates.slice(i, j + 1);
        const start = run[0].line;
        const heading = headingLines.filter((h) => h <= start).pop();
        const near = heading === undefined ? 0 : Math.max(0, 30 - (start - heading));
        const spread = run[run.length - 1].line - start;
        const score = near * 2 + run.length - spread * 0.5;
        if (score > bestScore) {
          best = run;
          bestScore = score;
        }
        break;
      }
    }
  }

  const chosen = best ?? candidates;
  const seen = new Set<string>();
  const items: SyllabusItem[] = [];
  for (const c of chosen) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name: c.name, weight: c.weight, count: c.count });
    if (items.length >= MAX_ITEMS) break;
  }

  // A rule already in a component's name, like "Webwork (best 9 of 10)", isn't repeated as a note.
  const namesByLine = new Map<number, string>();
  for (const c of chosen) namesByLine.set(c.line, `${namesByLine.get(c.line) ?? ''} ${c.name.toLowerCase()}`);
  const notes: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.length < 8 || notes.length >= MAX_NOTES) continue;
    const match = NOTE_PATTERNS.map((p) => line.match(p)).find(Boolean);
    if (match && namesByLine.get(index)?.includes(match[0].toLowerCase())) continue;
    if (match) {
      const sentence = line.length > 200 ? `${line.slice(0, 197)}…` : line;
      if (!notes.includes(sentence)) notes.push(sentence);
    }
  }

  return { items, notes, source: 'rules' };
}

/** The part of a long syllabus most likely to hold the grading scheme, for the model. */
export function gradingExcerpt(text: string, maxChars = 16_000): string {
  if (text.length <= maxChars) return text;
  const at = text.search(/\b(grading|marking scheme|evaluation|assessment|grade breakdown)\b/i);
  const start = at < 0 ? 0 : Math.max(0, at - 1_500);
  return text.slice(start, start + maxChars);
}
