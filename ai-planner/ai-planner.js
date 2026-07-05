(function () {
  const OFFICIAL_NOTE = 'Unofficial planning help only. Verify important decisions with the UofT Calendar, department pages, your registrar, or an academic advisor.';
  let seedCourses = [];

  const storedTheme = localStorage.getItem('uoft_theme') || 'light';
  document.documentElement.dataset.theme = storedTheme === 'dark' ? 'dark' : 'light';

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab-btn')),
    panels: {
      planner: document.getElementById('plannerPanel'),
      explainer: document.getElementById('explainerPanel'),
      semester: document.getElementById('semesterPanel'),
      enrolment: document.getElementById('enrolmentPanel'),
      ask: document.getElementById('askPanel')
    },
    planForm: document.getElementById('planForm'),
    explainForm: document.getElementById('explainForm'),
    askForm: document.getElementById('askForm'),
    planResult: document.getElementById('planResult'),
    explainResult: document.getElementById('explainResult'),
    semesterResult: document.getElementById('semesterResult'),
    enrolmentResult: document.getElementById('enrolmentResult'),
    askResult: document.getElementById('askResult'),
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
    target.innerHTML = card('Could not finish that request', `<p>${escapeHtml(message)}</p><p>${escapeHtml(OFFICIAL_NOTE)}</p>`, { full: true, warning: true });
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

  function fallbackAsk(payload) {
    const question = String(payload.question || '').trim();
    return {
      officialNote: OFFICIAL_NOTE,
      answer: question
        ? `I would treat this as a planning question, not a rule lookup. Based on the MVP course data, check course difficulty, prerequisites, timetable sections, and POSt relevance before committing. If your question involves requirements or eligibility, verify it in official UofT sources.`
        : 'Ask a specific planning question, like whether a course mix looks heavy or what to verify before enrolment.',
      nextSteps: [
        'Name the exact courses and term if you want a more useful workload read.',
        'Check the UofT Calendar for prerequisites, exclusions, breadth, and program rules.',
        'Ask your registrar or academic advisor about anything that affects graduation, POSt, or enrolment eligibility.'
      ]
    };
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

  function renderAsk(data) {
    els.askResult.innerHTML = [
      card('AI Planner answer', `<p>${escapeHtml(data.answer)}</p>`, { full: true }),
      card('Next steps', list(data.nextSteps), { full: true }),
      card('Official verification', `<p>${escapeHtml(data.officialNote || OFFICIAL_NOTE)}</p>`, { full: true, warning: true })
    ].join('');
  }

  async function runSemesterCheck() {
    setLoading(els.semesterResult, 'Checking your MySemester courses...');
    const payload = readSemesterData();
    const data = await postJson('/api/ai-planner/semester-check', payload, fallbackSemester);
    renderSemester(data);
  }

  els.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      els.tabs.forEach((item) => item.classList.toggle('active', item === btn));
      Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle('active', key === tab));
      if (tab === 'semester' && !els.semesterResult.innerHTML.trim()) runSemesterCheck();
    });
  });

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

  els.askForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(els.askForm);
    const payload = {
      question: String(form.get('question') || '').trim(),
      semester: readSemesterData()
    };
    if (!payload.question) {
      setError(els.askResult, 'Type a planning question first.');
      return;
    }
    setLoading(els.askResult, 'Drafting a short planning answer...');
    const data = await postJson('/api/ai-planner/ask', payload, fallbackAsk);
    renderAsk(data);
  });

  els.semesterRefresh.addEventListener('click', runSemesterCheck);
  initPlannerSelects();

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
