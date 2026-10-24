import { extractText, getDocumentProxy } from 'unpdf';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  gradingExcerpt,
  itemsTotal,
  MAX_SYLLABUS_CHARS,
  MAX_SYLLABUS_FILE_BYTES,
  parseSyllabusText,
  sanitizeItems,
  sanitizeNotes,
  type SyllabusResult,
} from '@/lib/syllabus';

/**
 * POST /api/syllabus  →  SyllabusResult
 *
 * Body: multipart form with a `file` (PDF or plain text).
 * The syllabus is read in memory, its grading scheme extracted, and nothing is
 * kept. With OPENAI_API_KEY set, the grading section is also read by the model
 * and its answer is used when it fits better; otherwise only the rule-based
 * parser runs.
 */

const OPENAI_TIMEOUT_MS = 25_000;
const limited = createRateLimiter(15, 10 * 60_000);

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function pdfText(bytes: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function readSyllabus(request: Request): Promise<string | Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Choose the syllabus PDF to upload.', 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return fail('Choose the syllabus PDF to upload.', 400);
  if (file.size > MAX_SYLLABUS_FILE_BYTES) return fail('That file is too big. Try a PDF under 4 MB.', 413);
  const bytes = await file.arrayBuffer();
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (isPdf) {
    try {
      return await pdfText(bytes);
    } catch {
      return fail('Couldn’t read that PDF. Try another copy of the syllabus.', 422);
    }
  }
  if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) return new TextDecoder().decode(bytes);
  return fail('Upload the syllabus as a PDF.', 415);
}

async function askModel(text: string): Promise<SyllabusResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const system = [
    'You read university course syllabi and extract the grading scheme.',
    'Return strict JSON: { "items": [{ "name": string, "weight": number, "count": integer }], "notes": string[] }.',
    'items: only components that count toward the final grade, in the order listed.',
    '"weight" is the total percent for that component; "count" is how many separately graded pieces it has (1 for a single exam).',
    'For "5 quizzes worth 2% each" use weight 10 and count 5; for "Four tests 55% (13.75% each)" use weight 55 and count 4.',
    'Use the syllabus names, kept short, without the count ("Tests", not "Four Tests"), and keep ordinals ("1st Written Test").',
    'Skip "Total" rows, grading scales (A+ 90–100), late penalties and examples from policy text.',
    'notes: up to 5 short rules from this course that change how weights apply (best N of M, dropped lowest, weight shifted to the final, must pass the final). Not accessibility or exam-scheduling boilerplate. Empty if none.',
    'Never invent components or weights that are not in the text. If there is no grading scheme, return empty items.',
  ].join(' ');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: gradingExcerpt(text) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '') as Record<string, unknown>;
    const items = sanitizeItems(parsed.items);
    return items.length ? { items, notes: sanitizeNotes(parsed.notes), source: 'ai' } : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (limited(request)) return fail('Too many syllabus uploads. Try again in a few minutes.', 429);
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_SYLLABUS_FILE_BYTES + 100_000) return fail('That file is too big. Try a PDF under 4 MB.', 413);

  const read = await readSyllabus(request);
  if (read instanceof Response) return read;
  const text = read.slice(0, MAX_SYLLABUS_CHARS).trim();
  if (text.length < 20) {
    return fail('Couldn’t find any text in that file. If it’s a scanned PDF, try a copy where you can select the text.', 422);
  }

  const rules = parseSyllabusText(text);
  const ai = await askModel(text);
  // Use the model's answer unless the rule-based one adds up to 100% more closely.
  const off = (r: SyllabusResult) => Math.abs(itemsTotal(r.items) - 100);
  const result = ai && (!rules.items.length || off(ai) <= off(rules)) ? { ...ai, notes: ai.notes.length ? ai.notes : rules.notes } : rules;
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
