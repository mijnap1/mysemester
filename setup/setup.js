const stepTitle = document.getElementById('stepTitle');
const optionsEl = document.getElementById('options');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const pager = document.getElementById('pager');
const panel = document.getElementById('panel');
const stepper = document.getElementById('stepper');

(() => {
  function hasCompletedSetup() {
    try {
      const raw = localStorage.getItem('uoft_onboarding_v1');
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.university && data.year && data.program);
    } catch (err) {
      return false;
    }
  }
  let authState = null;
  try {
    authState = JSON.parse(localStorage.getItem('uoft_auth_v1') || 'null');
  } catch (err) {
    authState = null;
  }
  if (!authState || !authState.loggedIn) {
    window.location.href = '/login/';
    return;
  }
  if (hasCompletedSetup()) {
    window.location.href = '/main/';
  }
})();

const steps = [
  {
    key: 'university',
    title: 'Which university are you attending?',
    options: [
      'University of Toronto',
      'University of British Columbia',
      'McGill University',
      'University of Waterloo',
      'University of Alberta',
      'McMaster University',
      'University of Ottawa',
      'York University'
    ]
  },
  {
    key: 'year',
    title: 'What is your current year of study?',
    options: ['Year 1', 'Year 2', 'Year 3', 'Year 4']
  },
  {
    key: 'program',
    title: 'What is your program of study?',
    options: [
      'Accounting',
      'Architecture',
      'Biology',
      'Biomedical Engineering',
      'Business Administration',
      'Chemical Engineering',
      'Chemistry',
      'Civil Engineering',
      'Computer Engineering',
      'Computer Science',
      'Economics',
      'Electrical Engineering',
      'Engineering',
      'English',
      'Finance',
      'History',
      'Industrial Engineering',
      'International Relations',
      'Life Sciences',
      'Marketing',
      'Mathematics',
      'Mechanical Engineering',
      'Neuroscience',
      'Nursing',
      'Philosophy',
      'Physics',
      'Political Science',
      'Psychology',
      'Public Health',
      'Sociology',
      'Software Engineering',
      'Statistics',
      'Urban Planning',
      'Other'
    ]
  }
];

let stepIndex = 0;
const answers = {};

function renderStepper() {
  if (!stepper) return;
  stepper.innerHTML = '';
  steps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'step-dot';
    if (i === stepIndex) dot.classList.add('active');
    if (i < stepIndex) dot.classList.add('done');
    stepper.appendChild(dot);
    if (i < steps.length - 1) {
      const rail = document.createElement('span');
      rail.className = 'step-rail';
      if (i < stepIndex) rail.classList.add('done');
      stepper.appendChild(rail);
    }
  });
}

function renderStep() {
  const step = steps[stepIndex];
  if (panel) {
    panel.classList.remove('step-enter');
    void panel.offsetWidth;
    panel.classList.add('step-enter');
  }
  stepTitle.textContent = step.title;
  pager.textContent = `${stepIndex + 1} / ${steps.length}`;
  renderStepper();
  backBtn.style.display = stepIndex === 0 ? 'none' : 'inline-flex';
  optionsEl.innerHTML = '';
  step.options.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.style.setProperty('--opt-delay', `${Math.min(i * 22, 240)}ms`);
    btn.textContent = option;
    if (answers[step.key] === option) btn.classList.add('active');
    btn.addEventListener('click', () => {
      answers[step.key] = option;
      Array.from(optionsEl.children).forEach(child => child.classList.remove('active'));
      btn.classList.add('active');
      nextBtn.disabled = false;
    });
    optionsEl.appendChild(btn);
  });
  nextBtn.textContent = stepIndex === steps.length - 1 ? 'Finish' : 'Next';
  nextBtn.disabled = !answers[step.key];
}

backBtn.addEventListener('click', () => {
  if (stepIndex === 0) return;
  stepIndex -= 1;
  renderStep();
});

nextBtn.addEventListener('click', () => {
  if (nextBtn.disabled) return;
  if (stepIndex < steps.length - 1) {
    stepIndex += 1;
    renderStep();
    return;
  }
  localStorage.setItem('uoft_onboarding_v1', JSON.stringify(answers));
  window.location.href = '/main/';
});

renderStep();
