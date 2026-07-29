(function () {
  const OFFICIAL_NOTE = 'Unofficial planning help only. Verify important decisions with the UofT Calendar, department pages, your registrar, or an academic advisor.';
  const COURSE_PLACEHOLDER_CODES = [
    'CSC108',
    'MAT137',
    'STA130',
    'ECO101',
    'MAT135',
    'PHL245',
    'BIO120',
    'CHM135',
    'MAT136',
    'PSY100',
    'SOC100',
    'AST101',
    'CSC148',
    'CSC165',
    'MAT223',
    'POL101',
    'HIS102',
    'ENG100',
    'ECO102',
    'ANT100',
    'LIN101',
    'VIC100',
    'TRN125'
  ];
  let seedCourses = [];
  let currentAskAnalysis = null;

  const storedTheme = localStorage.getItem('uoft_theme') || 'light';
  document.documentElement.dataset.theme = storedTheme === 'dark' ? 'dark' : 'light';

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab-btn[data-tab]')),
    panels: {
      planner: document.getElementById('plannerPanel'),
      explainer: document.getElementById('explainerPanel'),
      semester: document.getElementById('semesterPanel'),
      enrolment: document.getElementById('enrolmentPanel'),
      ask: document.getElementById('askPanel')
    },
    planForm: document.getElementById('planForm'),
    coursesInput: document.querySelector('#planForm input[name="courses"]'),
    explainForm: document.getElementById('explainForm'),
    askAnalyzeBtn: document.getElementById('askAnalyzeBtn'),
    askLoading: document.getElementById('askLoading'),
    askLoadingText: document.getElementById('askLoadingText'),
    askDashboard: document.getElementById('askDashboard'),
    askTierHero: document.getElementById('askTierHero'),
    askSections: document.getElementById('askSections'),
    askChatPanel: document.getElementById('askChatPanel'),
    askChatForm: document.getElementById('askChatForm'),
    askChatLog: document.getElementById('askChatLog'),
    planResult: document.getElementById('planResult'),
    explainResult: document.getElementById('explainResult'),
    semesterResult: document.getElementById('semesterResult'),
    enrolmentResult: document.getElementById('enrolmentResult'),
    semesterRefresh: document.getElementById('semesterRefresh')
  };

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function parseCourses(value) {
    return String(value || '')
      .split(',')
      .map(normalizeCode)
      .filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[ch]));
  }

  function difficultyClass(value) {
    return String(value || '').toLowerCase();
  }

  function card(title, body, options = {}) {
    const className = ['ai-card', options.full ? 'full' : '', options.warning ? 'warning' : ''].filter(Boolean).join(' ');
    return `<article class="${className}"><h3>${escapeHtml(title)}</h3>${body}</article>`;
  }

  function list(items) {
    const safe = (items || []).filter(Boolean);
    if (!safe.length) return '<p>No items yet.</p>';
    return `<ul>${safe.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function badges(items) {
    return `<div class="badge-row">${(items || []).filter(Boolean).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  function initRotatingCoursePlaceholder() {
    if (!els.coursesInput) return;
    let lastPlaceholder = '';

    function nextPlaceholder() {
      const groupSize = [1, 1, 2, 2, 3][Math.floor(Math.random() * 5)];
      const shuffled = COURSE_PLACEHOLDER_CODES.slice().sort(() => Math.random() - 0.5);
      const next = shuffled.slice(0, groupSize).join(', ');
      return next === lastPlaceholder ? shuffled.slice(groupSize, groupSize + Math.max(1, groupSize)).join(', ') : next;
    }

    function rotate() {
      if (document.activeElement === els.coursesInput || els.coursesInput.value.trim()) return;
      const next = nextPlaceholder();
      lastPlaceholder = next;
      els.coursesInput.classList.add('placeholder-swapping');
      window.setTimeout(() => {
        els.coursesInput.placeholder = next;
        els.coursesInput.classList.remove('placeholder-swapping');
      }, 160);
    }

    els.coursesInput.placeholder = 'CSC108';
    window.setInterval(rotate, 2300);
  }

  function courseBadge(course) {
    return `<div class="badge-row">
      <span class="badge">${escapeHtml(course.code)}</span>
      <span class="badge ${difficultyClass(course.roughDifficulty)}">${escapeHtml(course.roughDifficulty)} difficulty</span>
      <span class="badge">${escapeHtml(course.confidenceLevel)}</span>
    </div>`;
  }

  function setLoading(target, message) {
    target.innerHTML = `<div class="loading-card">${escapeHtml(message)}</div>`;
  }

  function setError(target, message) {
    target.innerHTML = `<article class="ai-card full validation-card">
      <span class="validation-dot" aria-hidden="true"></span>
      <div class="validation-copy">
        <h3>${escapeHtml(message)}</h3>
        <p>Try <strong>CSC108, MAT137, STA130</strong> or choose courses from the catalog.</p>
      </div>
    </article>`;
  }

  function closePlannerSelects(exceptWrap) {
    document.querySelectorAll('[data-select].open').forEach((wrap) => {
      if (wrap !== exceptWrap) wrap.classList.remove('open');
    });
  }

  function initPlannerSelects() {
    document.querySelectorAll('[data-select]').forEach((wrap) => {
      const button = wrap.querySelector('[data-select-button]');
      const input = wrap.querySelector('[data-select-input]');
      const menu = wrap.querySelector('.planner-select-menu');
      button?.addEventListener('click', (event) => {
        event.preventDefault();
        const willOpen = !wrap.classList.contains('open');
        closePlannerSelects(willOpen ? wrap : null);
        wrap.classList.toggle('open', willOpen);
      });
      menu?.addEventListener('click', (event) => {
        const option = event.target.closest('.planner-select-option');
        if (!option) return;
        const value = option.dataset.value || option.textContent.trim();
        if (input) input.value = value;
        if (button) button.textContent = value;
        menu.querySelectorAll('.planner-select-option').forEach((item) => {
          item.classList.toggle('is-selected', item === option);
        });
        wrap.classList.remove('open');
      });
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-select]')) closePlannerSelects();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePlannerSelects();
    });
  }

  async function postJson(url, payload, fallback) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      return await res.json();
    } catch (err) {
      return fallback(payload);
    }
  }

  function findSeedCourse(code) {
    return seedCourses.find((course) => course.code === normalizeCode(code));
  }

  function fallbackPlan(payload) {
    const courses = payload.courses.map((code) => findSeedCourse(code) || {
      code,
      title: 'Course title unavailable in MVP dataset',
      commonPaths: [],
      roughDifficulty: 'Medium',
      notes: 'This course is not in the local MVP seed list yet.',
      warnings: ['Verify prerequisites, exclusions, breadth, meeting sections, and program requirements officially.'],
      confidenceLevel: 'Verify officially'
    });
    const highCount = courses.filter((course) => course.roughDifficulty === 'High').length;
    return {
      source: 'mock',
      officialNote: OFFICIAL_NOTE,
      courses,
      riskWarnings: [
        highCount >= 2 ? 'Two or more high-difficulty courses can make the term feel tight, especially during midterms.' : '',
        payload.workload === 'Ambitious' ? 'Ambitious schedules need backup sections and a realistic weekly study plan.' : '',
        payload.concerns.includes('POSt') ? 'Do not rely on AI for POSt rules. Check current program admission pages directly.' : '',
        payload.concerns.includes('CR/NCR') ? 'CR/NCR can affect program requirements. Verify before choosing it.' : ''
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

  function fallbackExplain(payload) {
    const code = normalizeCode(payload.courseCode);
    const course = findSeedCourse(code);
    if (!course) {
      return {
        officialNote: OFFICIAL_NOTE,
        course: {
          code,
          title: 'Course title unavailable in MVP dataset',
          commonPaths: [],
          roughDifficulty: 'Medium',
          notes: 'This course is not in the local AI Planner seed dataset yet.',
          warnings: ['Search the current UofT Calendar and department page for exact details.'],
          confidenceLevel: 'Verify officially'
        },
        misunderstandings: [
          'A course code alone does not confirm prerequisites, exclusions, breadth, or program fit.',
          'Difficulty depends on background, instructor, assessment style, and term workload.'
        ]
      };
    }
    return {
      officialNote: OFFICIAL_NOTE,
      course,
      misunderstandings: [
        'Introductory does not always mean low workload.',
        'A course can be useful for a path without satisfying a formal requirement.',
        'Difficulty is subjective and changes with background and assessment format.'
      ]
    };
  }

  function getUserCandidates() {
    const users = [];
    try {
      const auth = JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
      if (auth?.username) users.push(auth.username);
    } catch (_) {}
    const currentUser = localStorage.getItem('uoft_current_user');
    if (currentUser) users.push(currentUser);
    users.push('guest');
    return Array.from(new Set(users.filter(Boolean)));
  }

  function readJsonStorage(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function readSemesterData() {
    let state = null;
    const users = getUserCandidates();
    const keys = [
      ...users.map((user) => `uoft-grade-lite-v5-${user}`),
      ...users.map((user) => `mysemester_courses_${user}`),
      'uoft-grade-lite-v5'
    ];
    try {
      Object.keys(localStorage).forEach((key) => {
        if ((key.startsWith('uoft-grade-lite-v5-') || key.startsWith('mysemester_courses_')) && !keys.includes(key)) {
          keys.push(key);
        }
      });
    } catch (_) {}
    for (const key of keys) {
      const parsed = readJsonStorage(key);
      if (!parsed || !Array.isArray(parsed.courses)) continue;
      if (!state) state = parsed;
      if (parsed.courses.length) {
        state = parsed;
        break;
      }
    }
    const courses = (state?.courses || []).map((course) => {
      const code = normalizeCode(course.code || course.id);
      let assessments = [];
      for (const user of users) {
        try {
          const raw = localStorage.getItem(`grades_${user}_${code}_v3`);
          const parsed = JSON.parse(raw || '[]');
          if (Array.isArray(parsed) && parsed.length) {
            assessments = parsed;
            break;
          }
          if (Array.isArray(parsed) && !assessments.length) {
            assessments = parsed;
          }
        } catch (_) {}
      }
      return {
        code,
        title: course.title || '',
        grade: typeof course.grade === 'number' ? course.grade : null,
        crncr: !!course.crncr,
        assessments
      };
    }).filter((course) => course.code);
    return { courses };
  }

  function fallbackSemester(payload) {
    const courses = payload.courses || [];
    if (!courses.length) {
      return {
        empty: true,
        officialNote: OFFICIAL_NOTE,
        message: 'Add courses in MySemester first, then come back for a workload check.'
      };
    }
    const highCourses = courses.filter((course) => findSeedCourse(course.code)?.roughDifficulty === 'High');
    const assessmentCounts = courses.map((course) => ({
      code: course.code,
      count: Array.isArray(course.assessments) ? course.assessments.length : 0,
      incomplete: (course.assessments || []).filter((a) => a.grade == null || a.grade === '').length
    }));
    const totalAssessments = assessmentCounts.reduce((sum, item) => sum + item.count, 0);
    return {
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

  function asNumber(value) {
    const number = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(number) ? number : null;
  }

  function courseAverageFromAssessments(assessments) {
    let weightedTotal = 0;
    let usedWeight = 0;
    (assessments || []).forEach((item) => {
      const grade = asNumber(item.grade);
      const weight = asNumber(item.weight) ?? 0;
      if (grade != null && weight > 0) {
        weightedTotal += grade * weight;
        usedWeight += weight;
      }
    });
    return usedWeight > 0 ? weightedTotal / usedWeight : null;
  }

  function mean(values) {
    const usable = values.filter((value) => value != null);
    if (!usable.length) return null;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
  }

  function formatPercent(value) {
    return value == null ? 'No grade yet' : `${Math.round(value * 10) / 10}%`;
  }

  function classifyCourseRisk(course, average) {
    if (course.grade == null) return 'unknown';
    if (course.grade < 60 || course.missing >= 3 || (course.difficulty === 'High' && course.grade < 70)) return 'at-risk';
    if (course.grade < 72 || course.missing > 0 || (average != null && course.grade < average - 7)) return 'watch';
    return 'safe';
  }

  function tierFromScore(score) {
    if (score >= 94) return { label: 'S Tier', className: 's', headline: 'Elite position' };
    if (score >= 88) return { label: 'A+ Tier', className: 'aplus', headline: 'Premium academic position' };
    if (score >= 80) return { label: 'A Tier', className: 'a', headline: 'Strong, but still upgradable' };
    if (score >= 70) return { label: 'B Tier', className: 'b', headline: 'Good base with clear leaks' };
    if (score >= 60) return { label: 'C Tier', className: 'c', headline: 'Needs structure now' };
    return { label: 'Recovery Tier', className: 'recovery', headline: 'Immediate action needed' };
  }

  function inferPath(courses) {
    const counts = new Map();
    courses.forEach((course) => {
      (course.paths || []).forEach((path) => {
        counts.set(path, (counts.get(path) || 0) + 1);
      });
    });
    const [topPath] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] || [];
    return topPath || 'your saved semester';
  }

  function buildAskAnalysis() {
    const semester = readSemesterData();
    const courses = (semester.courses || []).map((course) => {
      const seed = findSeedCourse(course.code);
      const assessments = Array.isArray(course.assessments) ? course.assessments : [];
      const computed = courseAverageFromAssessments(assessments);
      const savedGrade = asNumber(course.grade);
      const grade = computed ?? savedGrade;
      const missing = assessments.filter((item) => item.grade == null || item.grade === '').length;
      const completed = assessments.filter((item) => asNumber(item.grade) != null).length;
      const usedWeight = assessments.reduce((sum, item) => {
        const grade = asNumber(item.grade);
        const weight = asNumber(item.weight) ?? 0;
        return grade != null ? sum + weight : sum;
      }, 0);
      return {
        ...course,
        title: course.title || seed?.title || '',
        grade,
        missing,
        completed,
        assessmentCount: assessments.length,
        usedWeight,
        difficulty: seed?.roughDifficulty || 'Unknown',
        paths: seed?.commonPaths || []
      };
    });
    const graded = courses.filter((course) => course.grade != null);
    const average = mean(graded.map((course) => course.grade));
    courses.forEach((course) => {
      course.risk = classifyCourseRisk(course, average);
    });
    const safe = courses.filter((course) => course.risk === 'safe');
    const watch = courses.filter((course) => course.risk === 'watch');
    const atRisk = courses.filter((course) => course.risk === 'at-risk');
    const unknown = courses.filter((course) => course.risk === 'unknown');
    const totalMissing = courses.reduce((sum, course) => sum + course.missing, 0);
    const spread = graded.length >= 2
      ? Math.max(...graded.map((course) => course.grade)) - Math.min(...graded.map((course) => course.grade))
      : 0;
    const baseScore = average ?? 52;
    const score = Math.max(0, Math.min(100,
      baseScore
      - (atRisk.length * 7)
      - (watch.length * 3)
      - Math.min(totalMissing * 1.5, 10)
      - (spread > 18 ? 5 : spread > 12 ? 2 : 0)
      + (safe.length >= 3 ? 2 : 0)
    ));
    const tier = tierFromScore(score);
    const strongest = graded.slice().sort((a, b) => b.grade - a.grade)[0] || null;
    const weakest = graded.slice().sort((a, b) => a.grade - b.grade)[0] || null;
    const topPriority = [...atRisk, ...watch, ...unknown][0] || weakest || courses[0] || null;
    const major = inferPath(courses);
    return {
      major,
      year: 'current year',
      courses,
      average,
      score,
      tier,
      strongest,
      weakest,
      topPriority,
      counts: {
        total: courses.length,
        graded: graded.length,
        safe: safe.length,
        watch: watch.length,
        atRisk: atRisk.length,
        unknown: unknown.length,
        missing: totalMissing
      },
      groups: { safe, watch, atRisk, unknown }
    };
  }

  function renderMetric(label, value, note = '') {
    return `<div class="ask-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ''}
    </div>`;
  }

  function riskLine(course) {
    const label = {
      safe: 'Safe',
      watch: 'Watch',
      'at-risk': 'At risk',
      unknown: 'Unknown'
    }[course.risk] || 'Unknown';
    return `${course.code}: ${label} - ${formatPercent(course.grade)}${course.missing ? `, ${course.missing} missing` : ''}`;
  }

  function askSuggestions(analysis) {
    if (!analysis.counts.total) {
      return ['Add courses and assessment rows in MySemester first so Ask AI Planner can build a real tier.'];
    }
    const suggestions = [];
    if (analysis.topPriority) {
      suggestions.push(`Start with ${analysis.topPriority.code}; it has the clearest impact on your next tier.`);
    }
    if (analysis.counts.missing) {
      suggestions.push(`Resolve or estimate ${analysis.counts.missing} missing assessment${analysis.counts.missing === 1 ? '' : 's'} so the tier reflects reality.`);
    }
    if (analysis.weakest && analysis.strongest && analysis.weakest.code !== analysis.strongest.code) {
      suggestions.push(`Protect ${analysis.strongest.code} while raising ${analysis.weakest.code}; that improves both average and consistency.`);
    }
    if (analysis.major && analysis.major !== 'your saved semester') {
      suggestions.push(`Your course mix points toward ${analysis.major}; verify program rules officially, then prioritize courses tied to admission, prerequisites, or progression.`);
    }
    suggestions.push('Use the next seven days for one targeted grade lift, not scattered studying across every course.');
    return suggestions;
  }

  function renderAskAnalysis(analysis) {
    currentAskAnalysis = analysis;
    if (!els.askDashboard || !els.askTierHero || !els.askSections || !els.askChatPanel || !els.askChatLog) return;
    els.askDashboard.hidden = false;
    els.askChatPanel.hidden = false;

    if (!analysis.counts.total) {
      els.askTierHero.innerHTML = `
        <div class="tier-main recovery">
          <span>No Tier Yet</span>
          <strong>Add course data first</strong>
          <p>Ask AI Planner needs saved MySemester courses or grades before it can analyze your semester.</p>
        </div>`;
      els.askSections.innerHTML = card('What to do next', list(askSuggestions(analysis)), { full: true });
      els.askChatLog.innerHTML = `<div class="chat-message bot">Add courses and grades in MySemester, then come back here and run the analyzer.</div>`;
      return;
    }

    const riskItems = [
      ...analysis.groups.atRisk.map(riskLine),
      ...analysis.groups.watch.map(riskLine),
      ...analysis.groups.unknown.map(riskLine),
      ...analysis.groups.safe.map(riskLine)
    ];
    const summary = [
      renderMetric('Average', formatPercent(analysis.average), `${analysis.counts.graded}/${analysis.counts.total} courses graded`),
      renderMetric('Strongest', analysis.strongest ? `${analysis.strongest.code} ${formatPercent(analysis.strongest.grade)}` : 'Unknown'),
      renderMetric('Priority', analysis.topPriority ? analysis.topPriority.code : 'None yet'),
      renderMetric('Missing', String(analysis.counts.missing), 'assessment rows without grades')
    ].join('');

    els.askTierHero.innerHTML = `
      <div class="tier-main ${escapeHtml(analysis.tier.className)}">
        <span>${escapeHtml(analysis.tier.headline)}</span>
        <strong>${escapeHtml(analysis.tier.label)}</strong>
        <p>Score ${Math.round(analysis.score)} / 100 from your saved MySemester data.</p>
      </div>
      <div class="tier-breakdown">
        ${renderMetric('Safe', String(analysis.counts.safe))}
        ${renderMetric('Watch', String(analysis.counts.watch))}
        ${renderMetric('At risk', String(analysis.counts.atRisk))}
        ${renderMetric('Unknown', String(analysis.counts.unknown))}
      </div>`;

    els.askSections.innerHTML = [
      card('Academic Snapshot', `<div class="ask-metric-grid">${summary}</div>`),
      card('Course Risk Analysis', list(riskItems.length ? riskItems : ['No course risks detected yet.'])),
      card('Tier Score', `<p>Your current tier is <strong>${escapeHtml(analysis.tier.label)}</strong>. The biggest penalties come from at-risk courses, missing grades, and uneven performance across courses.</p>`),
      card('Push To A+ Plan', list(askSuggestions(analysis)), { warning: true }),
      card('Official verification', `<p>${escapeHtml(OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');

    els.askChatLog.innerHTML = `<div class="chat-message bot">I analyzed ${analysis.counts.total} course${analysis.counts.total === 1 ? '' : 's'} and placed you at ${escapeHtml(analysis.tier.label)}. Ask what is hurting your tier, what to focus on this week, or how to push toward A+.</div>`;
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function runAskAnalysisFlow() {
    if (!els.askAnalyzeBtn) return;
    els.askAnalyzeBtn.disabled = true;
    els.askAnalyzeBtn.innerHTML = '<ion-icon name="pulse-outline"></ion-icon> Analyzing...';
    if (els.askDashboard) els.askDashboard.hidden = true;
    if (els.askChatPanel) els.askChatPanel.hidden = true;
    if (els.askLoading) els.askLoading.hidden = false;

    const steps = [
      'Collecting saved MySemester grade data...',
      'Checking course risk and missing assessments...',
      'Calculating your tier score...',
      'Building your A+ upgrade plan...'
    ];
    for (const step of steps) {
      if (els.askLoadingText) els.askLoadingText.textContent = step;
      await sleep(420);
    }

    renderAskAnalysis(buildAskAnalysis());
    if (els.askLoading) els.askLoading.hidden = true;
    if (els.askDashboard) {
      els.askDashboard.classList.remove('is-visible');
      requestAnimationFrame(() => els.askDashboard.classList.add('is-visible'));
    }
    if (els.askChatPanel) {
      els.askChatPanel.classList.remove('is-visible');
      requestAnimationFrame(() => els.askChatPanel.classList.add('is-visible'));
    }
    els.askAnalyzeBtn.disabled = false;
    els.askAnalyzeBtn.innerHTML = '<ion-icon name="refresh-outline"></ion-icon> Analyze again';
  }

  function answerAskQuestion(question, analysis) {
    const lower = question.toLowerCase();
    if (!analysis || !analysis.counts.total) {
      return 'I need saved MySemester course and grade data first. Add courses or assessments, then run Analyze my semester.';
    }
    if (lower.includes('tier') || lower.includes('a+')) {
      const blockers = [
        analysis.counts.atRisk ? `${analysis.counts.atRisk} at-risk course${analysis.counts.atRisk === 1 ? '' : 's'}` : '',
        analysis.counts.watch ? `${analysis.counts.watch} watch course${analysis.counts.watch === 1 ? '' : 's'}` : '',
        analysis.counts.missing ? `${analysis.counts.missing} missing assessment${analysis.counts.missing === 1 ? '' : 's'}` : ''
      ].filter(Boolean).join(', ');
      return `You are at ${analysis.tier.label}. To push toward A+ Tier, fix ${blockers || 'consistency and course-specific weak spots'} first. ${askSuggestions(analysis)[0]}`;
    }
    if (lower.includes('focus') || lower.includes('week') || lower.includes('study')) {
      return analysis.topPriority
        ? `Focus this week on ${analysis.topPriority.code}. Current read: ${formatPercent(analysis.topPriority.grade)}, ${analysis.topPriority.risk.replace('-', ' ')}. Pick one upcoming or missing assessment there and make that your highest-leverage task.`
        : 'Focus on adding grade data first; there is not enough course detail to rank priorities.';
    }
    if (lower.includes('risk') || lower.includes('hurting') || lower.includes('weak')) {
      const risk = [...analysis.groups.atRisk, ...analysis.groups.watch].slice(0, 3).map(riskLine);
      return risk.length
        ? `The main tier drag is: ${risk.join('; ')}. Start with the first one because it has the clearest downside.`
        : 'No major risk is visible from the saved grades. The next improvement is consistency: keep strong courses stable while filling missing assessment data.';
    }
    if (lower.includes('average') || lower.includes('grade')) {
      return `Your current saved average is ${formatPercent(analysis.average)} across ${analysis.counts.graded} graded course${analysis.counts.graded === 1 ? '' : 's'}. ${analysis.weakest ? `${analysis.weakest.code} is the most direct average lift right now.` : 'Add more grades for a sharper read.'}`;
    }
    return `Based on your saved data, you are at ${analysis.tier.label} with an average of ${formatPercent(analysis.average)}. The best next move is: ${askSuggestions(analysis)[0]}`;
  }

  function renderPlan(data) {
    const courseCards = (data.courses || []).map((course) => card(
      `${course.code}: ${course.title}`,
      `${courseBadge(course)}<p>${escapeHtml(course.notes)}</p>${list(course.warnings)}`,
    )).join('');
    els.planResult.innerHTML = [
      card('Risk warnings', list(data.riskWarnings), { warning: true }),
      card('Suggested checklist', list(data.checklist)),
      card('Questions to verify', list(data.verifyQuestions), { full: true }),
      courseCards,
      card('Official verification', `<p>${escapeHtml(data.officialNote || OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');
  }

  function renderExplain(data) {
    const course = data.course;
    els.explainResult.innerHTML = [
      card(`${course.code}: ${course.title}`, `${courseBadge(course)}<p>${escapeHtml(course.notes)}</p>`),
      card('Common misunderstandings', list(data.misunderstandings)),
      card('Relevant paths', badges(course.commonPaths || ['Verify officially'])),
      card('Warnings', list(course.warnings), { warning: true }),
      card('Difficulty note', `<p>Difficulty estimate: <strong>${escapeHtml(course.roughDifficulty)}</strong>. Difficulty is subjective and depends on your background, instructor, assessments, and other courses.</p><p>${escapeHtml(data.officialNote || OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');
  }

  function renderSemester(data) {
    if (data.empty) {
      els.semesterResult.innerHTML = card('No course data yet', `<p>${escapeHtml(data.message)}</p><p>${escapeHtml(data.officialNote || OFFICIAL_NOTE)}</p>`, { full: true });
      return;
    }
    els.semesterResult.innerHTML = [
      card('Semester snapshot', `<p>${escapeHtml(data.overview)}</p>`),
      card('Workload warnings', list(data.warnings), { warning: true }),
      card('Assessment clustering', list(data.clustering?.length ? data.clustering : ['No obvious clustering from the available MySemester rows. Add due dates to your calendar for a stronger check.'])),
      card('Balance suggestions', list(data.suggestions), { full: true }),
      card('Official verification', `<p>${escapeHtml(data.officialNote || OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');
  }

  function renderEnrolment() {
    els.enrolmentResult.innerHTML = [
      card('Before enrolment opens', list([
        'Prepare backup lecture, tutorial, and practical sections.',
        'Check LEC/TUT/PRA requirements for each course.',
        'Check timetable conflicts, commute gaps, and back-to-back tests where possible.',
        'Log in early before your enrolment time.',
        'Verify program requirements in the UofT Calendar and department pages.',
        'Save alternate courses in case a section fills.'
      ])),
      card('Ask officially when', list([
        'A choice affects POSt, graduation, transfer credit, or program eligibility.',
        'You are considering CR/NCR for a course connected to your intended program.',
        'Calendar wording, exclusions, or prerequisites are unclear.'
      ]), { warning: true }),
      card('Reminder', `<p>${escapeHtml(OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');
  }

  async function runSemesterCheck() {
    setLoading(els.semesterResult, 'Checking your MySemester courses...');
    const payload = readSemesterData();
    const data = await postJson('/api/ai-planner/semester-check', payload, fallbackSemester);
    renderSemester(data);
  }

  const TAB_PATHS = {
    planner: '/ai-planner/',
    explainer: '/ai-planner/explainer/',
    semester: '/ai-planner/semester/',
    enrolment: '/ai-planner/enrolment/',
    ask: '/ai-planner/ask/'
  };

  function tabFromLocation() {
    const path = location.pathname.replace(/\/+$/, '/') || '/';
    const match = Object.entries(TAB_PATHS).find(([, tabPath]) => tabPath === path);
    if (match) return match[0];
    if (location.hash) return location.hash.slice(1);
    return 'planner';
  }

  function activateTab(tab) {
    if (!els.panels[tab]) return;
    els.tabs.forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));
    Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle('active', key === tab));
    if (tab === 'semester' && !els.semesterResult.innerHTML.trim()) runSemesterCheck();
  }

  els.tabs.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      if (btn.classList.contains('tab-disabled') || btn.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      activateTab(btn.dataset.tab);
      history.pushState(null, '', TAB_PATHS[btn.dataset.tab] || '/ai-planner/');
    });
  });

  window.addEventListener('popstate', () => activateTab(tabFromLocation()));

  activateTab(tabFromLocation());

  els.planForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(els.planForm);
    const payload = {
      path: form.get('path'),
      courses: parseCourses(form.get('courses')),
      workload: form.get('workload'),
      concerns: form.getAll('concerns')
    };
    if (!payload.courses.length) {
      setError(els.planResult, 'Enter at least one course code.');
      return;
    }
    setLoading(els.planResult, 'Building a first-pass plan...');
    const data = await postJson('/api/ai-planner/plan', payload, fallbackPlan);
    renderPlan(data);
  });

  els.explainForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(els.explainForm);
    const payload = { courseCode: normalizeCode(form.get('courseCode')) };
    if (!payload.courseCode) {
      setError(els.explainResult, 'Enter a course code like CSC108.');
      return;
    }
    setLoading(els.explainResult, 'Explaining the course...');
    const data = await postJson('/api/ai-planner/explain', payload, fallbackExplain);
    renderExplain(data);
  });

  els.askAnalyzeBtn?.addEventListener('click', () => {
    void runAskAnalysisFlow();
  });

  els.askChatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(els.askChatForm);
    const question = String(form.get('question') || '').trim();
    if (!question || !els.askChatLog) {
      return;
    }
    if (!currentAskAnalysis) {
      currentAskAnalysis = buildAskAnalysis();
      renderAskAnalysis(currentAskAnalysis);
    }
    const answer = answerAskQuestion(question, currentAskAnalysis);
    els.askChatLog.insertAdjacentHTML('beforeend', `
      <div class="chat-message user">${escapeHtml(question)}</div>
      <div class="chat-message bot">${escapeHtml(answer)}</div>
    `);
    els.askChatLog.scrollTop = els.askChatLog.scrollHeight;
    els.askChatForm.reset();
  });

  els.semesterRefresh.addEventListener('click', runSemesterCheck);
  initPlannerSelects();
  initRotatingCoursePlaceholder();

  fetch('/data/ai-planner-courses.json')
    .then((res) => res.json())
    .then((courseData) => {
      seedCourses = Array.isArray(courseData) ? courseData : [];
      renderEnrolment();
    })
    .catch(() => {
      seedCourses = [];
      renderEnrolment();
    });
})();
