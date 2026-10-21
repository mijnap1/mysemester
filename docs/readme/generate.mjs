// Generates the README's animated SVGs into docs/readme/. Run: node docs/readme/generate.mjs
//
// logo.svg   the app icon on a blue-and-white tile
// hero.svg   the dashboard on a loop: courses, then the Deadlines tab (a quiz gets ticked and
//            "Add to grades" drops a toast into the nav bar), then back to courses
// flow-*.svg how Quercus deadlines reach the dashboard, in light and dark
//
// Everything is drawn as SVG with Outfit embedded, so it stays crisp and works as a GitHub <img>.
// The student and courses are made up.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = join(root, 'docs/readme');
mkdirSync(out, { recursive: true });

const font = readFileSync(join(root, 'node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2')).toString('base64');
const fontFace = `@font-face { font-family: "Outfit"; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }`;
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const blue = '#2563eb';
const ink = '#0f172a';
const muted = '#64748b';
const line = '#e5e7eb';

// The mortarboard from public/mysemesterlogo.png, on a 100-unit circle centred at (50, 50).
const cap = (fill) => `
  <polygon points="21.6,42.4 50,26.6 78,42.4 50,58" fill="${fill}"/>
  <polygon points="32,53 32,64 50,73 68,64 68,53 50,62.4" fill="${fill}"/>
  <rect x="72.6" y="45" width="4.6" height="18" fill="${fill}"/>`;

// ---------------------------------------------------------------------------
// Logo

function logo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-labelledby="t">
  <title id="t">MySemester</title>
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e3edff"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#d5e3ff"/>
    </linearGradient>
    <linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip"><rect x="8" y="8" width="224" height="224" rx="56"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#1d4ed8" flood-opacity="0.28"/></filter>
  </defs>
  <style>
    .sheen { animation: sheen 7s ${ease} infinite; }
    @keyframes sheen { 0%, 70% { transform: translateX(-260px); } 100% { transform: translateX(260px); } }
    @media (prefers-reduced-motion: reduce) { .sheen { animation: none; opacity: 0; } }
  </style>
  <rect x="8" y="8" width="224" height="224" rx="56" fill="url(#tile)" stroke="#cbdaf5" stroke-width="2"/>
  <g filter="url(#shadow)">
    <circle cx="120" cy="120" r="66" fill="url(#disc)"/>
    <g transform="translate(54 54) scale(1.32)">${cap('#fff')}</g>
  </g>
  <g clip-path="url(#clip)"><rect class="sheen" x="-40" y="0" width="90" height="240" fill="url(#sheen)" transform="skewX(-18)"/></g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Hero

const CYCLE = 14;
const pct = (t) => `${((Math.min(CYCLE, Math.max(0, t)) / CYCLE) * 100).toFixed(3)}%`;
/**
 * Keyframes from [seconds, css] pairs; the state holds between the listed times. The first and last
 * states are pinned to 0% and 100%, or CSS would ease them back to the element's default.
 */
function frames(name, stops) {
  const all = [...stops];
  if (all[0][0] > 0) all.unshift([0, all[0][1]]);
  if (all[all.length - 1][0] < CYCLE) all.push([CYCLE, all[all.length - 1][1]]);
  return `@keyframes ${name} { ${all.map(([t, css]) => `${pct(t)} { ${css} }`).join(' ')} }`;
}

const glyph = {
  flask: '<path d="M-6 -12h12M-4 -12v8l-8 13a3 3 0 0 0 2.6 4.5h18.8A3 3 0 0 0 12 9l-8-13v-8" fill="none"/>',
  planet: '<circle r="8" fill="none"/><ellipse rx="14" ry="5" transform="rotate(-20)" fill="none"/>',
  music: '<path d="M-3 9V-10l12-3v18" fill="none"/><circle cx="-6.5" cy="9" r="3.5" fill="none"/><circle cx="5.5" cy="5.5" r="3.5" fill="none"/>',
  wallet: '<rect x="-12" y="-8" width="24" height="18" rx="3" fill="none"/><path d="M-12 -2h24M5 4h3" fill="none"/>',
  clock: '<circle r="4.6" fill="none"/><path d="M0 -2.2V0l1.6 1.2" fill="none"/>',
  alert: '<circle r="4.6" fill="none"/><path d="M0 -2.2v2.6M0 2.2v.2" fill="none"/>',
  calendar: '<rect x="-7" y="-6" width="14" height="13" rx="2.5" fill="none"/><path d="M-7 -2h14M-3 -8v3M3 -8v3" fill="none"/>',
  flame: '<path d="M0 -7c3 3 5 5.5 5 8.5a5 5 0 0 1-10 0c0-2 1-3.3 2.2-4.4.3 1.6 1 2.4 2 2.6-.8-2.4-.4-4.6.8-6.7Z" fill="none"/>',
};

const courses = [
  { code: 'BIO130', title: 'Molecular and Cell Biology', pct: '86%', icon: 'flask', next: 'Term Test 2', when: 'in 6 days' },
  { code: 'PHY131', title: 'Introduction to Physics I', pct: '78%', icon: 'planet', next: 'Practical 6', when: 'in 5 hrs' },
  { code: 'MUS111', title: 'Introduction to Music History', pct: '91%', icon: 'music', next: 'Listening Journal 4', when: 'in 2 days' },
  { code: 'ECO102', title: 'Principles of Macroeconomics', pct: '73%', icon: 'wallet', next: 'Problem Set 4', when: '12 hrs ago', overdue: true },
];

function hero() {
  const styles = [];
  const anim = (name, stops, extra = '') => {
    styles.push(frames(name, stops));
    return `style="animation: ${name} ${CYCLE}s ${ease} infinite;${extra}"`;
  };

  // Courses view: visible, fades out when the switch moves, rises back in at the end of the loop.
  const cardsSvg = courses
    .map((c, i) => {
      const x = i % 2 === 0 ? 260 : 610;
      const y = i < 2 ? 312 : 424;
      const back = 12.95 + i * 0.12;
      const a = anim(`card${i}`, [
        [0, 'opacity:1;transform:translateY(0)'],
        [5.6, 'opacity:1;transform:translateY(0)'],
        [5.95, 'opacity:0;transform:translateY(8px)'],
        [back, 'opacity:0;transform:translateY(14px)'],
        [back + 0.55, 'opacity:1;transform:translateY(0)'],
        [14, 'opacity:1;transform:translateY(0)'],
      ]);
      const nextColor = c.overdue ? '#dc2626' : blue;
      return `<g ${a}>
        <rect x="${x}" y="${y}" width="330" height="92" rx="18" fill="#fff" filter="url(#soft)"/>
        <g transform="translate(${x + 38} ${y + 46})" stroke="${blue}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph[c.icon]}</g>
        <text x="${x + 72}" y="${y + 33}" font-size="17" font-weight="700" fill="${ink}">${c.code}</text>
        <text x="${x + 72}" y="${y + 52}" font-size="12.5" fill="${muted}">${esc(c.title)}</text>
        <g transform="translate(${x + 77} ${y + 70})" stroke="${nextColor}" stroke-width="1.5" stroke-linecap="round">${glyph[c.overdue ? 'alert' : 'clock']}</g>
        <text x="${x + 87}" y="${y + 74}" font-size="11.5" font-weight="600" fill="${nextColor}">${esc(c.next)} <tspan fill="${muted}" font-weight="500">· ${c.when}</tspan></text>
        <text x="${x + 306}" y="${y + 54}" text-anchor="end" font-size="22" font-weight="700" fill="${blue}">${c.pct}</text>
      </g>`;
    })
    .join('');

  const tiles = [
    ['GPA (4.0)', '3.70'],
    ['Letter Avg', 'A-'],
    ['Percent Avg', '82%'],
  ]
    .map(([label, value], i) => {
      const x = 284 + i * 216;
      return `<rect x="${x}" y="540" width="200" height="56" rx="14" fill="#fff" stroke="${line}"/>
        <text x="${x + 100}" y="561" text-anchor="middle" font-size="11.5" fill="${muted}">${label}</text>
        <text x="${x + 100}" y="584" text-anchor="middle" font-size="18" font-weight="700" fill="${ink}">${value}</text>`;
    })
    .join('');
  const tilesAnim = anim('tiles', [
    [0, 'opacity:1'],
    [5.6, 'opacity:1'],
    [5.95, 'opacity:0'],
    [13.3, 'opacity:0'],
    [13.8, 'opacity:1'],
    [14, 'opacity:1'],
  ]);

  // Deadlines view.
  const panelAnim = anim('panel', [
    [0, 'opacity:0;transform:translateY(14px)'],
    [6.0, 'opacity:0;transform:translateY(14px)'],
    [6.6, 'opacity:1;transform:translateY(0)'],
    [12.35, 'opacity:1;transform:translateY(0)'],
    [12.75, 'opacity:0;transform:translateY(8px)'],
    [14, 'opacity:0;transform:translateY(14px)'],
  ]);
  const row = (y, title, code, when, opts = {}) => {
    const { test = false, id = '' } = opts;
    return `<g ${id ? `id="${id}"` : ''}>
      <rect x="300" y="${y + 7}" width="16" height="16" rx="4" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="328" y="${y + 15}" font-size="13.5" font-weight="600" fill="${ink}" ${id ? `class="${id}-title"` : ''}>${esc(title)}</text>
      <rect x="328" y="${y + 21}" width="${code.length * 7.6 + 14}" height="17" rx="8.5" fill="#f1f5f9" stroke="${line}"/>
      <text x="${328 + 7}" y="${y + 33.5}" font-size="10.5" font-weight="600" fill="#334155">${code}</text>
      ${test ? `<rect x="${328 + code.length * 7.6 + 20}" y="${y + 21}" width="34" height="17" rx="8.5" fill="#fee2e2"/><text x="${328 + code.length * 7.6 + 37}" y="${y + 33.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#b91c1c">Test</text>` : ''}
      <text x="900" y="${y + 15}" text-anchor="end" font-size="12" font-weight="600" fill="${ink}">${esc(when[0])}</text>
      <text x="900" y="${y + 31}" text-anchor="end" font-size="11" fill="${muted}">${esc(when[1])}</text>
    </g>`;
  };

  // A quiz gets ticked off.
  const tickBox = anim('tickbox', [[0, 'opacity:0'], [7.9, 'opacity:0'], [8.05, 'opacity:1'], [12.35, 'opacity:1'], [12.75, 'opacity:0']]);
  const tickPath = anim('tickpath', [[0, 'stroke-dashoffset:16'], [8.0, 'stroke-dashoffset:16'], [8.3, 'stroke-dashoffset:0'], [12.35, 'stroke-dashoffset:0'], [12.75, 'stroke-dashoffset:16']], 'stroke-dasharray:16;');
  const strike = anim('strike', [[0, 'transform:scaleX(0)'], [8.05, 'transform:scaleX(0)'], [8.35, 'transform:scaleX(1)'], [12.35, 'transform:scaleX(1)'], [12.75, 'transform:scaleX(0)']], 'transform-origin:328px 495px;');

  // "Add to grades" is clicked, the row shows "In grades" and the toast drops into the nav bar.
  const addBtn = anim('addbtn', [[0, 'opacity:0'], [8.7, 'opacity:0'], [8.95, 'opacity:1;transform:scale(1)'], [9.45, 'opacity:1;transform:scale(1)'], [9.55, 'opacity:1;transform:scale(0.94)'], [9.65, 'opacity:0;transform:scale(1)'], [14, 'opacity:0']], 'transform-origin:478px 569px;');
  const added = anim('added', [[0, 'opacity:0'], [9.6, 'opacity:0'], [9.8, 'opacity:1'], [12.35, 'opacity:1'], [12.75, 'opacity:0']]);
  const cursor = anim('cursor', [
    [0, 'opacity:0;transform:translate(760px, 640px)'],
    [8.55, 'opacity:0;transform:translate(760px, 640px)'],
    [8.7, 'opacity:1;transform:translate(760px, 640px)'],
    [9.35, 'opacity:1;transform:translate(494px, 572px)'],
    [9.5, 'opacity:1;transform:translate(494px, 572px) scale(0.88)'],
    [9.62, 'opacity:1;transform:translate(494px, 572px) scale(1)'],
    [10.4, 'opacity:0;transform:translate(500px, 600px)'],
    [14, 'opacity:0;transform:translate(760px, 640px)'],
  ]);
  const toast = anim('toast', [[0, 'opacity:0;transform:translateY(-10px)'], [9.65, 'opacity:0;transform:translateY(-10px)'], [9.95, 'opacity:1;transform:translateY(0)'], [11.9, 'opacity:1;transform:translateY(0)'], [12.25, 'opacity:0;transform:translateY(-8px)'], [14, 'opacity:0']]);

  // The switch and the subtitle.
  const thumb = anim('thumb', [[0, 'transform:translateX(0)'], [5.6, 'transform:translateX(0)'], [6.0, 'transform:translateX(104px)'], [12.35, 'transform:translateX(104px)'], [12.75, 'transform:translateX(0)'], [14, 'transform:translateX(0)']]);
  const coursesLabel = anim('lblc', [[0, 'fill:#0f172a'], [5.6, 'fill:#0f172a'], [6.0, 'fill:#64748b'], [12.35, 'fill:#64748b'], [12.75, 'fill:#0f172a']]);
  const deadlinesLabel = anim('lbld', [[0, 'fill:#64748b'], [5.6, 'fill:#64748b'], [6.0, 'fill:#0f172a'], [12.35, 'fill:#0f172a'], [12.75, 'fill:#64748b']]);
  const subA = anim('suba', [[0, 'opacity:1'], [5.6, 'opacity:1'], [5.9, 'opacity:0'], [12.45, 'opacity:0'], [12.75, 'opacity:1']]);
  const subB = anim('subb', [[0, 'opacity:0'], [5.75, 'opacity:0'], [6.05, 'opacity:1'], [12.35, 'opacity:1'], [12.6, 'opacity:0']]);
  const badge = anim('badge', [[0, 'opacity:1'], [8.05, 'opacity:1'], [8.15, 'opacity:0'], [12.75, 'opacity:0'], [12.85, 'opacity:1']]);
  const badge4 = anim('badge4', [[0, 'opacity:0'], [8.05, 'opacity:0'], [8.15, 'opacity:1'], [12.75, 'opacity:1'], [12.85, 'opacity:0']]);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700" role="img" aria-labelledby="title desc">
  <title id="title">MySemester dashboard</title>
  <desc id="desc">A student's dashboard: course cards with grades and each course's next deadline, then the Deadlines tab, where a quiz is ticked off and a test is added to the grade page.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8f0ff"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ecff"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#c7d6f2"/></pattern>
    <linearGradient id="dotfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.8" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="dotmask"><rect width="1200" height="700" fill="url(#dotfade)"/></mask>
    <filter id="window" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#1e40af" flood-opacity="0.18"/></filter>
    <filter id="soft" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.07"/></filter>
    <clipPath id="screen"><rect x="60" y="40" width="1080" height="620" rx="18"/></clipPath>
  </defs>
  <style>
    ${fontFace}
    text { font-family: "Outfit", "Segoe UI", system-ui, sans-serif; }
    ${styles.join('\n    ')}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>

  <rect width="1200" height="700" rx="28" fill="url(#bg)"/>
  <rect width="1200" height="700" rx="28" fill="url(#dots)" mask="url(#dotmask)" opacity="0.7"/>

  <g filter="url(#window)"><rect x="60" y="40" width="1080" height="620" rx="18" fill="#f9fafb"/></g>
  <g clip-path="url(#screen)">
    <rect x="60" y="40" width="1080" height="40" fill="#fbfcfe"/>
    <line x1="60" y1="80" x2="1140" y2="80" stroke="#eef1f6"/>
    <circle cx="86" cy="60" r="6" fill="#e2e8f0"/><circle cx="106" cy="60" r="6" fill="#e2e8f0"/><circle cx="126" cy="60" r="6" fill="#e2e8f0"/>
    <rect x="490" y="49" width="220" height="22" rx="7" fill="#f1f5f9"/>
    <text x="600" y="64.5" text-anchor="middle" font-size="12" fill="${muted}">mysemester.org/main</text>

    <rect x="60" y="80" width="1080" height="56" fill="#fff"/>
    <line x1="60" y1="136" x2="1140" y2="136" stroke="${line}"/>
    <g transform="translate(80 92) scale(0.31)">${cap(blue)}</g>
    <text x="114" y="114" font-size="18" font-weight="700" fill="${ink}" letter-spacing="-0.2">MySemester</text>
    ${[1010, 1052, 1094].map((x) => `<rect x="${x}" y="91" width="34" height="34" rx="10" fill="#fff" stroke="${line}"/>`).join('')}
    <circle cx="1027" cy="108" r="7" fill="none" stroke="${ink}" stroke-width="1.6"/>
    <path d="M1072 101a7 7 0 1 0 6 10a5.5 5.5 0 0 1-6-10Z" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M1104 103h14M1104 108h14M1104 113h14" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>

    <text x="600" y="198" text-anchor="middle" font-size="42" font-weight="700" fill="${ink}" letter-spacing="-0.8">Welcome, Alex</text>
    <text x="600" y="228" text-anchor="middle" font-size="15" fill="${muted}" ${subA}>Courses and academic overview</text>
    <text x="600" y="228" text-anchor="middle" font-size="15" fill="${muted}" ${subB}>Upcoming deadlines from Quercus</text>

    <rect x="492" y="246" width="220" height="42" rx="13" fill="#f1f5f9" stroke="${line}"/>
    <g ${thumb}><rect x="496" y="250" width="104" height="34" rx="10" fill="#fff" filter="url(#soft)"/></g>
    <text x="548" y="272" text-anchor="middle" font-size="13.5" font-weight="600" ${coursesLabel}>Courses</text>
    <text x="640" y="272" text-anchor="middle" font-size="13.5" font-weight="600" ${deadlinesLabel}>Deadlines</text>
    <circle cx="690" cy="267" r="9" fill="${blue}"/>
    <text x="690" y="271" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" ${badge}>5</text>
    <text x="690" y="271" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" ${badge4}>4</text>

    ${cardsSvg}
    <g ${tilesAnim}>${tiles}</g>

    <g ${panelAnim}>
      <rect x="280" y="304" width="640" height="336" rx="18" fill="#fff" stroke="${line}" filter="url(#soft)"/>
      <g transform="translate(308 330)" stroke="${blue}" stroke-width="1.6" stroke-linecap="round">${glyph.calendar}</g>
      <text x="324" y="336" font-size="16" font-weight="700" fill="${ink}">Upcoming</text>
      <text x="900" y="335" text-anchor="end" font-size="11.5" fill="${muted}">Synced 2 min ago</text>
      <rect x="300" y="350" width="600" height="30" rx="10" fill="#fffbeb" stroke="#fde68a"/>
      <g transform="translate(318 365)" stroke="#f59e0b" stroke-width="1.6" stroke-linejoin="round">${glyph.flame}</g>
      <text x="332" y="369.5" font-size="12.5" fill="#92400e"><tspan font-weight="700">Heavy week ahead:</tspan> 2 tests next week</text>

      <text x="300" y="402" font-size="10.5" font-weight="700" letter-spacing="0.6" fill="#dc2626">OVERDUE</text>
      ${row(406, 'Problem Set 4', 'ECO102', ['Yesterday, 11:59 PM', '12 hrs ago'])}
      <text x="300" y="464" font-size="10.5" font-weight="700" letter-spacing="0.6" fill="${muted}">TODAY</text>
      ${row(468, 'Pre-lab Quiz 5', 'BIO130', ['Today, 2:00 PM', 'in 2 hrs'])}
      <g ${tickBox}><rect x="300" y="475" width="16" height="16" rx="4" fill="${blue}"/></g>
      <path d="M303.5 483.2l3 3 6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${tickPath}/>
      <rect x="328" y="479" width="89" height="1.6" fill="${muted}" ${strike}/>
      <line x1="300" y1="516" x2="900" y2="516" stroke="#f1f5f9"/>
      <text x="300" y="536" font-size="10.5" font-weight="700" letter-spacing="0.6" fill="${muted}">NEXT 7 DAYS</text>
      ${row(540, 'Term Test 2', 'BIO130', ['Tue, 6:00 PM', 'in 6 days'], { test: true })}
      <g ${addBtn}>
        <rect x="436" y="561" width="86" height="17" rx="8.5" fill="#eff6ff" stroke="#93c5fd" stroke-dasharray="3 2"/>
        <text x="479" y="573.5" text-anchor="middle" font-size="10.5" font-weight="600" fill="${blue}">+ Add to grades</text>
      </g>
      <g ${added}>
        <path d="M440 569.5l2.5 2.5 5-5" fill="none" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="452" y="573.5" font-size="10.5" font-weight="600" fill="#16a34a">In grades</text>
      </g>
      <line x1="300" y1="588" x2="900" y2="588" stroke="#f1f5f9"/>
      ${row(592, 'Midterm', 'PHY131', ['Thu, 5:00 PM', 'in 8 days'], { test: true })}
    </g>

    <g ${toast}>
      <rect x="388" y="90" width="424" height="36" rx="11" fill="#fff" stroke="#86efac" filter="url(#soft)"/>
      <text x="404" y="113" font-size="12.5" font-weight="600" fill="#15803d">Added “Term Test 2” to BIO130. Set its weight there.</text>
      <rect x="752" y="96" width="52" height="24" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
      <text x="778" y="112.5" text-anchor="middle" font-size="12" font-weight="700" fill="${blue}">Open</text>
    </g>
  </g>

  <g ${cursor}>
    <path d="M0 0v17l4.6-4.4 3 6.6 2.8-1.3-3-6.4h6.2Z" fill="${ink}" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Flow: how Quercus deadlines reach the dashboard.

const themes = {
  light: { bg: ['#eef4ff', '#ffffff', '#e8f0ff'], card: '#ffffff', stroke: '#dbe5f5', ink: '#0f172a', muted: '#64748b', accent: '#2563eb', track: '#cbdaf5', dot: '#c7d6f2' },
  dark: { bg: ['#0b1220', '#0f172a', '#0d1830'], card: '#111a2e', stroke: '#1f2a44', ink: '#e5e7eb', muted: '#94a3b8', accent: '#60a5fa', track: '#24324f', dot: '#1c2742' },
};

const steps = [
  { n: '01', title: 'Quercus', sub: 'Calendar Feed link', note: ['Your private, read-only link', 'from Quercus → Calendar.'] },
  { n: '02', title: 'Fetch', sub: 'MySemester server', note: ['Only asks q.utoronto.ca.', 'Nothing stored or logged.'] },
  { n: '03', title: 'Save', sub: 'This browser', note: ['Deadlines and ticks stay', 'on this device.'] },
  { n: '04', title: 'Show', sub: 'Your dashboard', note: ['Deadlines tab, course', 'cards and grade pages.'] },
];

function flow(mode) {
  const t = themes[mode];
  const w = 255;
  const gap = 27;
  const x0 = 51;
  const cards = steps
    .map((s, i) => {
      const x = x0 + i * (w + gap);
      return `<g class="card" style="animation-delay:${i * 0.9}s">
        <rect x="${x}" y="44" width="${w}" height="172" rx="18" fill="${t.card}" stroke="${t.stroke}" class="frame"/>
        <text x="${x + 24}" y="80" font-size="13" font-weight="700" letter-spacing="2" fill="${t.accent}">${s.n}</text>
        <text x="${x + 24}" y="114" font-size="24" font-weight="700" fill="${t.ink}">${s.title}</text>
        <text x="${x + 24}" y="140" font-size="14.5" font-weight="600" fill="${t.muted}">${esc(s.sub)}</text>
        <text x="${x + 24}" y="172" font-size="13" fill="${t.muted}" opacity="0.9">${esc(s.note[0])}</text>
        <text x="${x + 24}" y="191" font-size="13" fill="${t.muted}" opacity="0.9">${esc(s.note[1])}</text>
      </g>`;
    })
    .join('');
  const arrows = steps
    .slice(0, -1)
    .map((_, i) => {
      const x = x0 + (i + 1) * (w + gap) - gap / 2;
      return `<path d="M${x - 4} 124l6 6-6 6" fill="none" stroke="${t.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 260" width="1200" height="260" role="img" aria-labelledby="t d">
  <title id="t">How Quercus deadlines reach MySemester</title>
  <desc id="d">Your Quercus calendar feed link is fetched by MySemester's server, which only contacts q.utoronto.ca and stores nothing. The deadlines are saved in your browser and shown on your dashboard.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg[0]}"/><stop offset="0.5" stop-color="${t.bg[1]}"/><stop offset="1" stop-color="${t.bg[2]}"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${t.dot}"/></pattern>
  </defs>
  <style>
    ${fontFace}
    text { font-family: "Outfit", "Segoe UI", system-ui, sans-serif; }
    .card .frame { animation: glow 3.6s ${ease} infinite; animation-delay: inherit; }
    .card { animation-delay: inherit; }
    @keyframes glow { 0%, 100% { stroke: ${t.stroke}; } 20%, 30% { stroke: ${t.accent}; } 55% { stroke: ${t.stroke}; } }
    .pulse { animation: travel 3.6s linear infinite; }
    @keyframes travel { 0% { transform: translateX(0); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateX(1062px); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  <rect width="1200" height="260" rx="24" fill="url(#bg)"/>
  <rect width="1200" height="260" rx="24" fill="url(#dots)" opacity="0.55"/>
  <line x1="${x0 + 20}" y1="236" x2="${1200 - x0 - 20}" y2="236" stroke="${t.track}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 8"/>
  <circle class="pulse" cx="${x0 + 20}" cy="236" r="5" fill="${t.accent}"/>
  ${cards}
  ${arrows}
</svg>`;
}

writeFileSync(join(out, 'logo.svg'), logo());
writeFileSync(join(out, 'hero.svg'), hero());
writeFileSync(join(out, 'flow-light.svg'), flow('light'));
writeFileSync(join(out, 'flow-dark.svg'), flow('dark'));
console.log('Wrote logo.svg, hero.svg, flow-light.svg, flow-dark.svg to docs/readme/');
