const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const OFFICIAL_NOTE = 'Unofficial planning help only. Verify important decisions with the UofT Calendar, department pages, your registrar, or an academic advisor.';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readSeedCourses() {
  const raw = fs.readFileSync(path.join(ROOT, 'data', 'ai-planner-courses.json'), 'utf8');
  return JSON.parse(raw);
}

const seedCourses = readSeedCourses();

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function findCourse(code) {
  return seedCourses.find((course) => course.code === normalizeCode(code));
}

function relevantSeedCourses(route, payload) {
  const codes = new Set();
  if (Array.isArray(payload.courses)) {
    payload.courses.forEach((item) => {
      const code = typeof item === 'string' ? item : item?.code;
      if (code) codes.add(normalizeCode(code));
    });
  }
  if (payload.courseCode) {
    codes.add(normalizeCode(payload.courseCode));
  }
  const text = JSON.stringify(payload || {});
  const codeMatches = text.match(/\b[A-Z]{3}\s*[0-9]{3}\b/gi) || [];
  codeMatches.forEach((code) => codes.add(normalizeCode(code)));

  const directMatches = Array.from(codes)
    .map((code) => findCourse(code))
    .filter(Boolean);
  if (directMatches.length) return directMatches;

  if (route.endsWith('/ask')) {
    return seedCourses.slice(0, 80);
  }
  return seedCourses.slice(0, 40);
}

function fallbackCourse(code) {
  return {
    code: normalizeCode(code),
    title: 'Course title unavailable in MVP dataset',
    commonPaths: [],
    roughDifficulty: 'Medium',
    notes: 'This course is not in the local MVP seed list yet.',
    warnings: ['Verify prerequisites, exclusions, breadth, meeting sections, and program requirements officially.'],
    confidenceLevel: 'Verify officially'
  };
}

function mockPlan(payload) {
  const courses = (payload.courses || []).map((code) => findCourse(code) || fallbackCourse(code));
  const highCount = courses.filter((course) => course.roughDifficulty === 'High').length;
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    courses,
    riskWarnings: [
      highCount >= 2 ? 'Two or more high-difficulty courses can make the term feel tight, especially during midterms.' : '',
      payload.workload === 'Ambitious' ? 'Ambitious schedules need backup sections and a realistic weekly study plan.' : '',
      (payload.concerns || []).includes('POSt') ? 'Do not rely on AI for POSt rules. Check current program admission pages directly.' : '',
      (payload.concerns || []).includes('CR/NCR') ? 'CR/NCR can affect program requirements. Verify before choosing it.' : ''
    ].filter(Boolean),
    checklist: [
      'Confirm prerequisites, exclusions, breadth category, and program fit in official UofT sources.',
      'Build a backup list with alternate lecture, tutorial, and practical sections.',
      'Map weekly assessments once syllabi are released.',
      'Ask an advisor which requirements are strict and which choices are flexible.'
    ],
    verifyQuestions: [
      `Does this set of courses support my intended ${payload.path || 'program'} path?`,
      'Are any of these courses required for POSt, and are there minimum grade rules?',
      'Do any lecture, tutorial, or practical sections conflict?',
      'Would CR/NCR change how this course counts for my goals?'
    ]
  };
}

function mockExplain(payload) {
  const course = findCourse(payload.courseCode) || fallbackCourse(payload.courseCode);
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    course,
    misunderstandings: [
      'Introductory does not always mean low workload.',
      'A course can be useful for a path without satisfying a formal requirement.',
      'Difficulty is subjective and changes with background and assessment format.'
    ]
  };
}

function mockSemester(payload) {
  const courses = Array.isArray(payload.courses) ? payload.courses : [];
  if (!courses.length) {
    return {
      source: 'mock',
      empty: true,
      officialNote: OFFICIAL_NOTE,
      message: 'Add courses in MySemester first, then come back for a workload check.'
    };
  }
  const highCourses = courses.filter((course) => findCourse(course.code)?.roughDifficulty === 'High');
  const assessmentCounts = courses.map((course) => ({
    code: normalizeCode(course.code),
    count: Array.isArray(course.assessments) ? course.assessments.length : 0,
    incomplete: (course.assessments || []).filter((item) => item.grade == null || item.grade === '').length
  }));
  const totalAssessments = assessmentCounts.reduce((sum, item) => sum + item.count, 0);
  return {
    source: 'mock',
    empty: false,
    officialNote: OFFICIAL_NOTE,
    overview: `${courses.length} course${courses.length === 1 ? '' : 's'} found with ${totalAssessments} tracked assessment${totalAssessments === 1 ? '' : 's'}.`,
    warnings: [
      highCourses.length >= 2 ? `${highCourses.length} locally flagged high-difficulty courses are in this semester.` : '',
      courses.length >= 5 ? 'Five or more courses can be demanding if several have labs, tutorials, or weekly problem sets.' : '',
      totalAssessments === 0 ? 'No assessments are tracked yet, so clustering analysis is limited.' : ''
    ].filter(Boolean),
    clustering: assessmentCounts
      .filter((item) => item.count >= 4 || item.incomplete >= 3)
      .map((item) => `${item.code}: ${item.count} assessment rows, ${item.incomplete} still missing grades.`),
    suggestions: [
      'Once syllabi are released, add due dates in your own calendar to catch true clustering.',
      'Pair high-difficulty technical courses with at least one steadier or lighter course when possible.',
      'Keep backup plans for courses that depend on POSt or enrolment priority.',
      'Use office hours early for courses with proofs, programming, or cumulative problem sets.'
    ]
  };
}

function mockAsk(payload) {
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    answer: 'I would treat this as a planning question, not a rule lookup. Check course difficulty, prerequisites, timetable sections, and POSt relevance before committing. If your question involves requirements or eligibility, verify it in official UofT sources.',
    nextSteps: [
      'Name the exact courses and term if you want a more useful workload read.',
      'Check the UofT Calendar for prerequisites, exclusions, breadth, and program rules.',
      'Ask your registrar or academic advisor about anything that affects graduation, POSt, or enrolment eligibility.'
    ]
  };
}

function schemaForRoute(route) {
  if (route.endsWith('/explain')) return '{ "officialNote": string, "course": courseObject, "misunderstandings": string[] }';
  if (route.endsWith('/semester-check')) return '{ "officialNote": string, "empty": boolean, "overview": string, "warnings": string[], "clustering": string[], "suggestions": string[] }';
  if (route.endsWith('/ask')) return '{ "officialNote": string, "answer": string, "nextSteps": string[] }';
  return '{ "officialNote": string, "courses": courseObject[], "riskWarnings": string[], "checklist": string[], "verifyQuestions": string[] }';
}

async function callOpenAI(route, payload, fallback) {
  if (!process.env.OPENAI_API_KEY) return fallback(payload);
  const system = [
    'You are AI Planner for MySemester, an unofficial helper for first-year UofT Arts & Science students.',
    'Never claim to be official advising. Never invent exact program, POSt, prerequisite, breadth, enrolment, or CR/NCR rules.',
    'If requirements matter, tell the user to verify with the UofT Calendar, department pages, registrar, or an academic advisor.',
    'Keep answers friendly, short, structured, and student-friendly.',
    `Return strict JSON matching this shape: ${schemaForRoute(route)}. Include this officialNote exactly: ${OFFICIAL_NOTE}`
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ payload, seedCourses: relevantSeedCourses(route, payload) }) }
      ],
    })
  });
  if (!response.ok) return fallback(payload);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(text);
    return { source: 'openai', ...parsed, officialNote: OFFICIAL_NOTE };
  } catch (_) {
    return fallback(payload);
  }
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function handleApi(req, res, pathname) {
  try {
    const payload = await parseBody(req);
    const handlers = {
      '/api/ai-planner/plan': (body) => callOpenAI(pathname, body, mockPlan),
      '/api/ai-planner/ask': (body) => callOpenAI(pathname, body, mockAsk),
      '/api/ai-planner/explain': (body) => callOpenAI(pathname, body, mockExplain),
      '/api/ai-planner/semester-check': (body) => callOpenAI(pathname, body, mockSemester)
    };
    if (!handlers[pathname]) {
      sendJson(res, 404, { error: 'Unknown AI Planner route' });
      return;
    }
    const data = await handlers[pathname](payload);
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 500, { error: 'AI Planner request failed', officialNote: OFFICIAL_NOTE });
  }
}

function serveStatic(req, res, pathname) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const requestedPath = path.join(ROOT, cleanPath || 'index.html');
  const safePath = requestedPath.startsWith(ROOT) ? requestedPath : path.join(ROOT, 'index.html');
  let filePath = safePath;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && url.pathname.startsWith('/api/ai-planner/')) {
    handleApi(req, res, url.pathname);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`MySemester local server running at http://${HOST}:${PORT}`);
});
