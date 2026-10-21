/**
 * A small iCalendar (RFC 5545) reader: just enough to pull VEVENTs out of a
 * Quercus (Canvas) calendar feed. Unknown properties and components are ignored.
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  url: string;
  /** ISO timestamp, or null when DTSTART is missing or unreadable. */
  start: string | null;
  /** True for date-only (all-day) events. */
  allDay: boolean;
}

/** Times without a zone ("floating") are read as UofT local time. */
const DEFAULT_TZ = 'America/Toronto';

/** Undo line folding: a line starting with a space or tab continues the previous one. */
function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(line: string): ContentLine | null {
  // The value starts at the first colon that is not inside a quoted parameter.
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon <= 0) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** Minutes to add to a wall-clock time in `timeZone` to get UTC, at roughly that instant. */
function zoneOffsetMinutes(utcGuess: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return (utcGuess - asUtc) / 60_000;
}

function wallTimeToIso(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): string | null {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  try {
    // Two passes settle the offset across a DST change.
    let offset = zoneOffsetMinutes(naive, timeZone);
    offset = zoneOffsetMinutes(naive + offset * 60_000, timeZone);
    return new Date(naive + offset * 60_000).toISOString();
  } catch {
    return null; // unknown time zone
  }
}

/** Read a DTSTART value into an ISO timestamp. */
export function parseIcsDate(value: string, params: Record<string, string> = {}): { iso: string | null; allDay: boolean } {
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (date || params.VALUE === 'DATE') {
    if (!date) return { iso: null, allDay: true };
    // All-day items count as due at the end of that day, local time.
    return { iso: wallTimeToIso(+date[1], +date[2], +date[3], 23, 59, 0, DEFAULT_TZ), allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!m) return { iso: null, allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return { iso: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString(), allDay: false };
  return { iso: wallTimeToIso(+y, +mo, +d, +h, +mi, +s, params.TZID || DEFAULT_TZ), allDay: false };
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: IcsEvent | null = null;
  let depth = 0; // nested components inside a VEVENT (e.g. VALARM) are skipped

  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === 'BEGIN') {
      if (current) depth++;
      else if (line.value.toUpperCase() === 'VEVENT') {
        current = { uid: '', summary: '', description: '', url: '', start: null, allDay: false };
      }
      continue;
    }
    if (line.name === 'END') {
      if (current && depth > 0) depth--;
      else if (current && line.value.toUpperCase() === 'VEVENT') {
        events.push(current);
        current = null;
      }
      continue;
    }
    if (!current || depth > 0) continue;
    switch (line.name) {
      case 'UID':
        current.uid = line.value.trim();
        break;
      case 'SUMMARY':
        current.summary = unescapeText(line.value).trim();
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(line.value);
        break;
      case 'URL':
        current.url = line.value.trim();
        break;
      case 'DTSTART': {
        const { iso, allDay } = parseIcsDate(line.value.trim(), line.params);
        current.start = iso;
        current.allDay = allDay;
        break;
      }
    }
  }
  return events;
}
