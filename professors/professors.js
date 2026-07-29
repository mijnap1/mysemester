const PROFESSOR_DATA = [
  {
    courseCode: 'STA130',
    courseTitle: 'Introduction to Statistical Reasoning and Data Science',
    professors: [
      {
        name: 'Nathan Taback',
        section: 'LEC0101',
        rating: 4.1,
        ratingsCount: 19,
        wouldTakeAgain: 77,
        difficulty: 3.0,
        tags: ['Organized', 'Approachable', 'Stats foundation'],
        summary: 'Students often describe his statistics teaching as clear and organized, especially when difficult ideas need slower examples.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816'
      },
      {
        name: 'Scott Schwartz',
        section: 'LEC0201',
        rating: 2.4,
        ratingsCount: 127,
        wouldTakeAgain: 33,
        difficulty: 4.0,
        tags: ['Mixed reviews', 'Test heavy', 'Attendance matters'],
        summary: 'Recent STA130 feedback is very split: some students mention caring course support, while others flag heavy workload and tough tests.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/2755105'
      },
      {
        name: 'Skye Griffith',
        section: 'LEC0301',
        rating: 4.3,
        ratingsCount: 8,
        wouldTakeAgain: 89,
        difficulty: 2.6,
        tags: ['Clear structure', 'Caring', 'Upper-year stats praise'],
        summary: 'Overall statistics reviews are strong, though the limited STA130 feedback means this should be treated as a lighter signal.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/3154346'
      }
    ]
  },
  {
    courseCode: 'CSC108',
    courseTitle: 'Introduction to Computer Programming',
    professors: [
      {
        name: 'Angela Bernuy',
        section: 'LEC0101',
        rating: 5.0,
        ratingsCount: 5,
        wouldTakeAgain: 100,
        difficulty: 1.8,
        tags: ['Beginner friendly', 'Caring', 'Clear lectures'],
        summary: 'CSC108 reviews describe her as supportive and easy to follow, with lectures that make programming feel more approachable.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/2728480'
      },
      {
        name: 'Harry Sha',
        section: 'LEC0201',
        rating: 4.6,
        ratingsCount: 11,
        wouldTakeAgain: 91,
        difficulty: 2.8,
        tags: ['Clear lectures', 'Fair exams', 'Helpful'],
        summary: 'Students often mention clear lectures and fair assessment style, with a beginner-friendly read for CSC108.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/2921120'
      },
      {
        name: 'Jennifer Campbell',
        section: 'LEC0301',
        rating: 4.3,
        ratingsCount: 78,
        wouldTakeAgain: 85,
        difficulty: 2.7,
        tags: ['Organized', 'Detailed answers', 'Clear grading'],
        summary: 'CSC108 reviews often point to organized course structure, detailed explanations, and transparent course logistics.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/362213'
      }
    ]
  },
  {
    courseCode: 'MAT137',
    courseTitle: 'Calculus with Proofs',
    professors: [
      {
        name: 'Yongquan (George) Huang',
        section: 'LEC0101',
        rating: 5.0,
        ratingsCount: 5,
        wouldTakeAgain: 100,
        difficulty: 1.8,
        tags: ['Passionate', 'Helpful tips', 'Office hours'],
        summary: 'MAT137 feedback describes him as approachable, enthusiastic, and useful for building confidence with proofs.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/3118926'
      },
      {
        name: 'Yitong Wang',
        section: 'LEC0201',
        rating: 4.8,
        ratingsCount: 4,
        wouldTakeAgain: 100,
        difficulty: 3.3,
        tags: ['Well paced', 'Reasonable exams', 'Good intuition'],
        summary: 'Students mention clear pacing, useful intuition-building, and exams that feel connected to lecture and tutorial material.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/3108740'
      },
      {
        name: 'Renato Ruiz',
        section: 'LEC0301',
        rating: 3.7,
        ratingsCount: 6,
        wouldTakeAgain: 67,
        difficulty: 3.3,
        tags: ['Improving pace', 'Hard course', 'Decent structure'],
        summary: 'MAT137 reviews describe the course as hard, but note that lecture organization and pacing can help as the term progresses.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/3030917'
      }
    ]
  },
  {
    courseCode: 'ECO101',
    courseTitle: 'Principles of Microeconomics',
    professors: [
      {
        name: 'Robert Gazzale',
        section: 'LEC0101',
        rating: 3.6,
        ratingsCount: 327,
        wouldTakeAgain: 68,
        difficulty: 4.1,
        tags: ['Practice material', 'Conceptual', 'Challenging'],
        summary: 'ECO101 reviews often mention lots of practice material and clear explanations, while still flagging the course as demanding.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/1737717'
      },
      {
        name: 'Abdollah Farhoodi',
        section: 'LEC0301',
        rating: 2.7,
        ratingsCount: 91,
        wouldTakeAgain: 40,
        difficulty: 3.7,
        tags: ['Real-world examples', 'Mixed reviews', 'Patient'],
        summary: 'Feedback is mixed, but positive ECO101 reviews mention patience, engagement, and real-world examples.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/2629781'
      },
      {
        name: 'Loren Brandt',
        section: 'LEC0201',
        rating: 2.4,
        ratingsCount: 129,
        wouldTakeAgain: 22,
        difficulty: 4.0,
        tags: ['Research focused', 'Long tests', 'Theory heavy'],
        summary: 'ECO101 feedback often frames the course as challenging and theory-heavy, with tests that require strong preparation.',
        sourceUrl: 'https://www.ratemyprofessors.com/professor/41847'
      }
    ]
  }
];

const searchEl = document.getElementById('courseSearch');
const quickPicksEl = document.getElementById('quickPicks');
const gridEl = document.getElementById('professorGrid');
const titleEl = document.getElementById('resultTitle');
const subtitleEl = document.getElementById('resultSubtitle');

function normalizeCourse(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function starsFor(rating) {
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => {
    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', index < rounded ? 'star' : 'star-outline');
    return icon.outerHTML;
  }).join('');
}

function renderEmpty(query = '') {
  const message = query
    ? `No test data for ${query} yet. We can add it to the mock dataset first, then connect real UofT timetable data later.`
    : 'Start with one of the sample UofT courses above, or search a course code.';
  titleEl.textContent = 'Popular picks';
  subtitleEl.textContent = 'Choose a course to see ranked test data.';
  gridEl.innerHTML = `
    <div class="empty-state">
      <ion-icon name="search-circle-outline"></ion-icon>
      <h3>No professor list selected</h3>
      <p>${message}</p>
    </div>
  `;
}

function renderCourse(course) {
  const sorted = [...course.professors].sort((a, b) => b.rating - a.rating || b.ratingsCount - a.ratingsCount);
  titleEl.textContent = `${course.courseCode} professor picks`;
  subtitleEl.textContent = course.courseTitle;
  gridEl.innerHTML = sorted.map((prof, index) => `
    <article class="prof-card">
      <div class="prof-top">
        <div class="prof-name">
          <h3>${prof.name}</h3>
          <span>${prof.section}</span>
        </div>
        <div class="rank">#${index + 1}</div>
      </div>
      <div>
        <div class="stars" aria-label="${prof.rating} out of 5 stars">${starsFor(prof.rating)}</div>
        <div class="score-row">
          <div class="score">${prof.rating.toFixed(1)}</div>
          <div class="score-meta">${prof.ratingsCount} ratings</div>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric">
          <span>Would take again</span>
          <strong>${prof.wouldTakeAgain}%</strong>
        </div>
        <div class="metric">
          <span>Difficulty</span>
          <strong>${prof.difficulty.toFixed(1)} / 5</strong>
        </div>
      </div>
      <div class="tag-row">
        ${prof.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <p class="summary">${prof.summary}</p>
      <a class="source-link" href="${prof.sourceUrl}" target="_blank" rel="noopener">
        Open RMP profile <ion-icon name="open-outline"></ion-icon>
      </a>
    </article>
  `).join('');
}

function setActiveQuickPick(courseCode) {
  quickPicksEl.querySelectorAll('.quick-pick').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.course === courseCode);
  });
}

function searchCourse(value) {
  const courseCode = normalizeCourse(value);
  const match = PROFESSOR_DATA.find(item => item.courseCode === courseCode);
  setActiveQuickPick(courseCode);
  if (!match) {
    renderEmpty(courseCode);
    return;
  }
  renderCourse(match);
}

function renderQuickPicks() {
  quickPicksEl.innerHTML = PROFESSOR_DATA.map(course => (
    `<button type="button" class="quick-pick" data-course="${course.courseCode}">${course.courseCode}</button>`
  )).join('');
  quickPicksEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.quick-pick');
    if (!btn) return;
    searchEl.value = btn.dataset.course;
    searchCourse(btn.dataset.course);
  });
}

renderQuickPicks();
renderEmpty();
searchEl.addEventListener('input', () => searchCourse(searchEl.value));
