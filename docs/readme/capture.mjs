// Captures the README's framed screenshots into docs/readme/.
//
//   1. Start the app:        npm run dev
//   2. In another terminal:  node docs/readme/capture.mjs
//
// A throwaway headless Chrome profile is filled with a demo UofT student (courses, grades, Quercus
// deadlines dated relative to today), each screen is captured at 2x, then every image is composed
// in HTML (blue panels, browser and phone frames) and saved as WebP. Needs Google Chrome and
// `cwebp` (brew install webp). Nothing is sent anywhere: the demo account never signs in.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = join(root, 'docs/readme');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const work = mkdtempSync(join(tmpdir(), 'mysemester-readme-'));
const rawDir = join(work, 'raw');
mkdirSync(rawDir, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// A tiny Chrome DevTools Protocol client (Node 22 has WebSocket built in).

async function launchChrome() {
  const profile = join(work, 'profile');
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-color-profile=srgb',
      '--allow-file-access-from-files',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    await wait(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch {
      // Chrome is still starting.
    }
  }
  if (!page) throw new Error('Chrome did not start. Set CHROME to its path.');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  await send('Page.enable');
  return {
    send,
    close() {
      ws.close();
      proc.kill();
    },
  };
}

const cdp = await launchChrome();

async function evaluate(expression) {
  const res = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(`${res.exceptionDetails.text}: ${expression.slice(0, 120)}`);
  return res.result.value;
}

async function viewport(width, height, { mobile = false, transparent = false } = {}) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
}

async function goto(url, settle = 1800) {
  await cdp.send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    await wait(100);
    if ((await evaluate('document.readyState').catch(() => '')) === 'complete') break;
  }
  // Fonts, Ionicons (fetched per icon) and entrance animations.
  await evaluate('document.fonts.ready.then(() => true)');
  await wait(settle);
}

/** Freeze animations and the caret so every capture is still. */
const STILL = `(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}nextjs-portal{display:none!important}'; document.head.appendChild(s); return true; })()`;

async function capture(name, clipSelector, pad = 0) {
  let clip;
  if (clipSelector) {
    const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(clipSelector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    clip = { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2, scale: 1 };
  }
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  writeFileSync(join(rawDir, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('  captured', name);
}

async function hover(selector) {
  const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
  await wait(150);
}

// ---------------------------------------------------------------------------
// Demo student: Alex Taylor (made up), second-year Life Sciences at UofT, Fall 2026.

const now = Date.now();
const H = 3_600_000;
const D = 24 * H;
const at = (ms, hour, minute = 59) => {
  const d = new Date(now + ms);
  if (hour !== undefined) d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const nextMonday = (() => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return d.getTime() - now;
})();

const row = (id, name, weight, grade = null) => ({ id, name, weight, grade, estimate: null });
const course = (id, code, title, icon, assessments, extra = {}) => ({
  id, code, title, icon, grade: null, crncr: false, folderId: null, assessments, updatedAt: new Date(now).toISOString(), ...extra,
});
const COURSES = [
  course('bio130', 'BIO130', 'Molecular and Cell Biology', 'flask-outline', [
    row('b1', 'Lab Reports', 15, 87), row('b2', 'Pre-lab Quizzes', 10, 94), row('b3', 'Term Test 1', 20, 82),
    row('b4', 'Term Test 2', 20), row('b5', 'Final Exam', 35),
  ]),
  course('phy131', 'PHY131', 'Introduction to Physics I', 'planet-outline', [
    row('y1', 'Practicals', 20, 81), row('y2', 'Problem Sets', 15, 74), row('y3', 'Midterm', 25),
    row('y4', 'Final Exam', 40),
  ]),
  course('mus111', 'MUS111', 'Introduction to Music History', 'musical-notes-outline', [
    row('u1', 'Listening Journals', 20, 93), row('u2', 'Concert Report', 15), row('u3', 'Midterm', 25, 90), row('u4', 'Final Exam', 40),
  ]),
  course('ant100', 'ANT100', 'Introduction to Anthropology', 'globe-outline', [
    row('a1', 'Reading Reflections', 20, 70), row('a2', 'Essay Proposal', 10), row('a3', 'Essay', 30), row('a4', 'Final Exam', 40),
  ], { crncr: true }),
  course('eco102', 'ECO102', 'Principles of Macroeconomics', 'wallet-outline', [
    row('e1', 'Problem Sets', 20, 76), row('e2', 'Midterm', 30, 71), row('e3', 'Final Exam', 50),
  ]),
];

const dl = (id, title, quercusCourse, code, dueAt, kind = 'assignment') => ({
  id, title, courseName: quercusCourse, courseCode: code, dueAt, allDay: false, kind, url: 'https://q.utoronto.ca/calendar',
});
const BIO = 'BIO130H1F 20269 (All Sections)';
const PHY = 'PHY131H1F 20269';
const MUS = 'MUS111H1F 20269';
const ANT = 'ANT100Y1Y 20269';
const ECO = 'ECO102H1F 20269';
const DEADLINES = [
  dl('e-ps4', 'Problem Set 4', ECO, 'ECO102H1', at(-1 * D, 23)),
  dl('b-pq5', 'Pre-lab Quiz 5', BIO, 'BIO130H1', new Date(now + 2 * H).toISOString()),
  dl('y-pr6', 'Practical 6: Projectile Motion', PHY, 'PHY131H1', new Date(now + 5 * H).toISOString()),
  dl('a-rr6', 'Reading Reflection 6', ANT, 'ANT100Y1', at(1 * D, 23)),
  dl('b-oh', 'Office hours: term test review', BIO, 'BIO130H1', at(2 * D, 15, 0), 'event'),
  dl('u-lj4', 'Listening Journal 4', MUS, 'MUS111H1', at(2 * D, 23)),
  dl('b-tt2', 'Term Test 2', BIO, 'BIO130H1', at(nextMonday + 1 * D, 18, 0), 'test'),
  dl('y-mt', 'Midterm', PHY, 'PHY131H1', at(nextMonday + 3 * D, 17, 0), 'test'),
  dl('a-ep', 'Essay Proposal', ANT, 'ANT100Y1', at(nextMonday + 8 * D, 23)),
  dl('u-cr', 'Concert Report', MUS, 'MUS111H1', at(nextMonday + 11 * D, 23)),
];

function seed({ theme = 'light', view = 'courses', quercus = true, prompt = false, finale = false } = {}) {
  const state = { version: 6, courses: COURSES, folders: [], currentFolderId: null, sync: { syncedCourseIds: [], syncedFolderIds: [], pendingCourseDeletes: [], pendingFolderDeletes: [] } };
  const link = { feedUrl: 'https://q.utoronto.ca/feeds/calendars/user_demo.ics', syncedAt: new Date(now - 2 * 60_000).toISOString(), done: ['b-pq5'], hidden: [], deadlines: DEADLINES };
  const keys = {
    uoft_auth_v1: { loggedIn: true, username: 'alex', email: 'alex@example.com', id: null, fullName: 'Alex Taylor' },
    mysemester_user_alex: { picture: '', name: 'Alex Taylor', nickname: 'Alex', email: 'alex@example.com', updatedAt: new Date(now - 3 * D).toISOString() },
    uoft_onboarding_v1: { university: 'University of Toronto', year: 'Year 2', program: 'Life Sciences' },
    'uoft-grade-lite-v5-alex': state,
  };
  const strings = {
    uoft_theme: theme,
    ms_tutorial_seen: '1',
    mysemester_professor_picks_hint_seen: '1',
    mysemester_dashboard_view: view,
    ...(prompt ? {} : { mysemester_quercus_prompt_dismissed: '1' }),
    ...(finale ? { ms_tutorial_finale: '1' } : {}),
  };
  if (quercus) keys.mysemester_quercus_alex = link;
  return `(() => { localStorage.clear(); const k = ${JSON.stringify(keys)}; for (const [n, v] of Object.entries(k)) localStorage.setItem(n, JSON.stringify(v)); const s = ${JSON.stringify(strings)}; for (const [n, v] of Object.entries(s)) localStorage.setItem(n, v); return true; })()`;
}

async function open(path, options, settle) {
  await goto(`${BASE}/main/`, 300);
  await evaluate(seed(options));
  await goto(`${BASE}${path}`, settle);
  await evaluate(STILL);
  await wait(200);
}

// ---------------------------------------------------------------------------
// Raw captures.

console.log('Capturing screens from', BASE);
const DESK = [1280, 820];
const PHONE = [390, 844];

await viewport(...DESK);
await open('/main/', { view: 'courses' });
await capture('desk-courses');
await capture('card-course', '.card[data-id="bio130"]', 14);

await open('/main/', { view: 'deadlines' });
// Hover a deadline so its "Add to grades" button shows.
await evaluate(`(() => { [...document.querySelectorAll('.deadline')].find((r) => r.textContent.includes('Listening Journal 4')).id = 'hover-me'; return true; })()`);
await hover('#hover-me');
await capture('desk-deadlines');

await open('/grade/?id=bio130', { view: 'courses' });
await capture('desk-grade');

await open('/main/', { theme: 'dark', view: 'courses' });
await capture('desk-courses-dark');

await open('/main/', { view: 'courses' });
await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Profile').click()`);
await wait(700);
await evaluate(STILL);
await capture('dialog-profile', '#profileModal');

await open('/main/', { view: 'deadlines', quercus: false });
await capture('card-connect', '.deadlines-connect', 0);
await evaluate(`document.querySelector('.deadlines-connect .btn-primary').click()`);
await wait(600);
await capture('dialog-connect', '#quercusConnectModal');

await open('/main/', { view: 'courses', quercus: false, prompt: true }, 3200);
await capture('card-prompt', '.quercus-prompt');

await open('/grade/?id=bio130', { finale: true }, 2200);
await capture('dialog-finale', '#tourFinale');

await open('/ai-planner/', {});
await capture('desk-planner');
await open('/gpa-scale/', {});
await capture('desk-gpa');
await open('/professors/?course=CSC108', {}, 4500);
await evaluate(`window.scrollTo(0, document.querySelector('.results-head').getBoundingClientRect().top + window.scrollY - 16)`);
await wait(300);
await capture('desk-professors');

await viewport(...PHONE, { mobile: true });
await open('/main/', { view: 'deadlines' });
await capture('phone-deadlines');
await open('/main/', { theme: 'dark', view: 'courses' });
await capture('phone-courses-dark');
await open('/grade/?id=bio130', {});
await capture('phone-grade');

// ---------------------------------------------------------------------------
// Compositions: HTML layouts rendered at 2x with a transparent background.

const font = pathToFileURL(join(root, 'node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2')).href;
const img = (name) => pathToFileURL(join(rawDir, `${name}.png`)).href;

const CSS = `
@font-face { font-family: Outfit; font-weight: 100 900; src: url(${font}) format('woff2'); }
* { box-sizing: border-box; margin: 0; }
html, body { background: transparent; font-family: Outfit, system-ui, sans-serif; color: #0f172a; }
.panel {
  position: relative; overflow: hidden; border-radius: 28px;
  background:
    radial-gradient(900px 420px at 12% -10%, #dbe8ff 0%, transparent 60%),
    radial-gradient(700px 380px at 110% 110%, #cfe0ff 0%, transparent 60%),
    linear-gradient(160deg, #f4f8ff 0%, #ffffff 48%, #eef4ff 100%);
  border: 1px solid #dbe5f5;
}
.panel::before {
  content: ''; position: absolute; inset: 0; opacity: .55;
  background-image: radial-gradient(#c7d6f2 1px, transparent 1.2px); background-size: 22px 22px;
  -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 75%);
}
.browser {
  position: absolute; overflow: hidden; border-radius: 16px; background: #fff;
  border: 1px solid rgba(15, 23, 42, .08);
  box-shadow: 0 40px 80px -20px rgba(30, 64, 175, .28), 0 12px 24px -12px rgba(15, 23, 42, .18);
}
.browser.dark { background: #0b1220; border-color: rgba(255,255,255,.08); }
.bar { height: 38px; display: flex; align-items: center; gap: 7px; padding: 0 14px; border-bottom: 1px solid #eef1f6; background: #fbfcfe; }
.dark .bar { background: #0f172a; border-bottom-color: #1f2937; }
.dot { width: 11px; height: 11px; border-radius: 50%; background: #e2e8f0; }
.dark .dot { background: #334155; }
.url { margin: 0 auto; transform: translateX(-24px); padding: 5px 16px; border-radius: 8px; background: #f1f5f9; font-size: 12.5px; color: #64748b; letter-spacing: .01em; }
.dark .url { background: #1e293b; color: #94a3b8; }
.shot { display: block; width: 100%; }
.fade { -webkit-mask-image: linear-gradient(180deg, #000 72%, transparent 100%); }
.phone {
  position: absolute; overflow: hidden; border-radius: 38px; background: #fff; padding: 8px;
  border: 1px solid rgba(15, 23, 42, .1);
  box-shadow: 0 40px 70px -18px rgba(30, 64, 175, .32), 0 10px 20px -10px rgba(15, 23, 42, .2);
}
.phone.dark { background: #0b1220; border-color: rgba(255,255,255,.1); }
.phone img { display: block; width: 100%; border-radius: 31px; }
.float { position: absolute; display: block; filter: drop-shadow(0 28px 40px rgba(30, 64, 175, .24)) drop-shadow(0 6px 12px rgba(15, 23, 42, .12)); }
.round { border-radius: 20px; }
.toast {
  position: absolute; display: flex; align-items: center; gap: 12px; padding: 9px 9px 9px 16px;
  background: #fff; border: 1px solid #86efac; border-radius: 13px; color: #15803d; font-size: 15px; font-weight: 600;
  box-shadow: 0 22px 40px -14px rgba(21, 128, 61, .3), 0 6px 14px -8px rgba(15, 23, 42, .15);
}
.toast b { font-weight: 700; padding: 6px 12px; border-radius: 9px; border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; }
.label { position: absolute; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
`;

const browser = (shot, { x, y, w, url, dark = false, fade = false, style = '' }) =>
  `<div class="browser${dark ? ' dark' : ''}" style="left:${x}px;top:${y}px;width:${w}px;${style}">
     <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${url}</span></div>
     <img class="shot${fade ? ' fade' : ''}" src="${img(shot)}">
   </div>`;
const phone = (shot, { x, y, w, dark = false, rotate = 0 }) =>
  `<div class="phone${dark ? ' dark' : ''}" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rotate}deg)"><img src="${img(shot)}"></div>`;

const LAYOUTS = {
  // Desktop dashboard with the phone's Deadlines view in front.
  showcase: [1200, 700, `
    ${browser('desk-courses', { x: 60, y: 56, w: 900, url: 'mysemester.org/main', fade: true })}
    ${phone('phone-deadlines', { x: 880, y: 150, w: 260 })}`],

  // Deadline list, with the toast that "Add to grades" shows.
  deadlines: [1200, 700, `
    ${browser('desk-deadlines', { x: 150, y: 60, w: 900, url: 'mysemester.org/main', fade: true })}
    <div class="toast" style="right:70px;top:30px">Added “Term Test 2” to BIO130. Set its weight there. <b>Open</b></div>`],

  // Course card -> its grade page.
  grades: [1200, 700, `
    ${browser('desk-grade', { x: 240, y: 56, w: 900, url: 'mysemester.org/grade/?id=bio130', fade: true })}
    <img class="float round" src="${img('card-course')}" style="left:56px;top:300px;width:330px">`],

  // Light and dark, split down a diagonal inside one window.
  themes: [1200, 690, `
    <div class="browser" style="left:150px;top:56px;width:900px">
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">mysemester.org/main</span></div>
      <div style="position:relative">
        <img class="shot" src="${img('desk-courses')}">
        <img class="shot" src="${img('desk-courses-dark')}" style="position:absolute;inset:0;clip-path:polygon(62% 0,100% 0,100% 100%,38% 100%)">
      </div>
    </div>`],

  // Three phones, fanned.
  phones: [1200, 720, `
    ${phone('phone-courses-dark', { x: 190, y: 90, w: 250, dark: true, rotate: -5 })}
    ${phone('phone-grade', { x: 470, y: 50, w: 260 })}
    ${phone('phone-deadlines', { x: 760, y: 90, w: 250, rotate: 5 })}`],

  // AI Planner, Professor Picks and the GPA scale guide.
  tools: [1200, 560, `
    ${browser('desk-gpa', { x: 40, y: 120, w: 520, url: 'mysemester.org/gpa-scale', fade: true, style: 'transform:rotate(-2deg)' })}
    ${browser('desk-professors', { x: 640, y: 120, w: 520, url: 'mysemester.org/professors', fade: true, style: 'transform:rotate(2deg)' })}
    ${browser('desk-planner', { x: 330, y: 48, w: 540, url: 'mysemester.org/ai-planner', fade: true, style: 'z-index:2' })}`],

  // How connecting Quercus looks: the empty Deadlines tab, the slide-in invite and the dialog.
  connect: [1200, 600, `
    <img class="float round" src="${img('card-connect')}" style="left:40px;top:160px;width:340px">
    <img class="float" src="${img('dialog-connect')}" style="left:400px;top:70px;width:420px;border-radius:18px;z-index:2">
    <img class="float round" src="${img('card-prompt')}" style="left:850px;top:290px;width:310px">`],

  // Profile dialog and the tutorial's closing card.
  dialogs: [1200, 720, `
    <img class="float" src="${img('dialog-profile')}" style="left:170px;top:44px;width:430px;border-radius:24px">
    <img class="float" src="${img('dialog-finale')}" style="left:670px;top:200px;width:360px;border-radius:22px">`],
};

console.log('Composing images');
await viewport(1200, 700, { transparent: true });
for (const [name, [w, h, body]] of Object.entries(LAYOUTS)) {
  await viewport(w, h, { transparent: true });
  const file = join(work, `${name}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><div class="panel" style="width:${w}px;height:${h}px">${body}</div>`);
  await goto(pathToFileURL(file).href, 400);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  const png = join(work, `${name}.png`);
  writeFileSync(png, Buffer.from(data, 'base64'));
  execFileSync('cwebp', ['-quiet', '-q', '88', '-alpha_q', '100', png, '-o', join(out, `${name}.webp`)]);
  console.log('  wrote docs/readme/' + name + '.webp');
}

cdp.close();
rmSync(work, { recursive: true, force: true });
console.log('Done.');
