

const params = new URLSearchParams(location.search);
const courseId = (params.get('course') || 'CSC108').toUpperCase();


let courseMeta = { title: 'Unknown Course', icon: 'book-outline', crncr: false };
try {
  const mainState = JSON.parse(localStorage.getItem('uoft-grade-lite-v5'));
  if (mainState && Array.isArray(mainState.courses)) {
    const found = mainState.courses.find(c => (c.code || '').toUpperCase() === courseId);
    if (found) courseMeta = { ...courseMeta, ...found };
  }
} catch (e) {  }

try {
  const selected = JSON.parse(localStorage.getItem('selectedCourse') || 'null');
  if (selected && selected.code && selected.code.toUpperCase() === courseId) {
    courseMeta = { ...courseMeta, ...selected };
  }
} catch (e) {  }


const courseCodeTextEl = document.getElementById('courseCodeText');
const courseDescEl = document.getElementById('courseDesc');
const courseCrncrTagEl = document.getElementById('courseCrncrTag');
const gpaSummaryBlockEl = document.getElementById('gpaSummaryBlock');
const estimateBtnEl = document.querySelector('.actions .estimate');
const undoToastEl = document.getElementById('undoToast');
const undoTextEl = document.getElementById('undoText');
const undoBtnEl = document.getElementById('undoBtn');

function getUniversityRules() {
  let university = '';
  try {
    const setup = JSON.parse(localStorage.getItem('uoft_onboarding_v1') || 'null');
    university = setup?.university || '';
  } catch (err) {
    university = '';
  }
  const base = { showGpa: true, showLetter: true, showPercent: true, creditAllowed: false, creditLabel: '' };
  if (university === 'University of Toronto') {
    return { ...base, creditAllowed: true, creditLabel: 'CR/NCR' };
  }
  if (university === 'University of British Columbia') {
    return { ...base, creditAllowed: true, creditLabel: 'CR/D/F' };
  }
  if (university === 'McGill University') {
    return { ...base, creditAllowed: true, creditLabel: 'S/U' };
  }
  if (university === 'University of Waterloo') {
    return { ...base, showGpa: false, showLetter: false, creditAllowed: false };
  }
  if (university === 'University of Alberta') {
    return { ...base, creditAllowed: false };
  }
  if (university === 'McMaster University') {
    return { ...base, creditAllowed: false };
  }
  if (university === 'University of Ottawa') {
    return { ...base, creditAllowed: false };
  }
  return base;
}
const universityRules = getUniversityRules();
function isCreditCourse() {
  return !!(universityRules.creditAllowed && courseMeta && courseMeta.crncr);
}

if (courseMeta && (courseMeta.code || courseMeta.title)) {
  const codeText = courseMeta.code ? courseMeta.code.toUpperCase() : courseId;
  courseCodeTextEl.textContent = codeText;
  courseDescEl.textContent = courseMeta.title || courseMeta.name || '';
} else {
  courseCodeTextEl.textContent = courseId;
  courseDescEl.textContent = '';
}


function updateEstimateLabel() {
  if (!estimateBtnEl) return;
  if (isCreditCourse()) {
    const creditLabel = universityRules.creditLabel || 'CR/NCR';
    const shortLabel = creditLabel.split('/')[0];
    estimateBtnEl.textContent = `Estimate for ${shortLabel} (50%)`;
    return;
  }
  const directTarget = localStorage.getItem('uoft_estimate_target');
  const settings = getSettings();
  const rawTarget = parseFloat(directTarget || settings.estimateTarget);
  const targetValue = !isNaN(rawTarget) ? rawTarget : 85;
  estimateBtnEl.textContent = `Estimate for ${targetValue}`;
}

if (isCreditCourse()) {
  if (courseCrncrTagEl) {
    courseCrncrTagEl.textContent = universityRules.creditLabel || 'CR/NCR';
    courseCrncrTagEl.style.display = 'inline-flex';
  }
} else if (courseCrncrTagEl) {
  courseCrncrTagEl.style.display = 'none';
}
if (gpaSummaryBlockEl) {
  gpaSummaryBlockEl.style.display = isCreditCourse() || !universityRules.showGpa ? 'none' : 'inline';
}
updateEstimateLabel();

window.addEventListener('focus', () => {
  updateEstimateLabel();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateEstimateLabel();
  }
});
    
    const userAuth = JSON.parse(localStorage.getItem("uoft_auth_v1"));
    const currentUser = userAuth && userAuth.username ? userAuth.username : "guest";
    const userGradeKey = `grades_${currentUser}_${courseId}_v3`;

    const SUPABASE_URL = "https://dqstskgvdiwdkonbapke.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3Rza2d2ZGl3ZGtvbmJhcGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDI0NzYsImV4cCI6MjA3NTg3ODQ3Nn0.2iFEYtVQZjQOY8_sF4x0SvWIKk8L-jg4yzpXzLLFe60";
    const CLOUD_TABLE = "mysemester_courses";
    const SETTINGS_KEY = "uoft_settings_v1";

    function getSupabaseClient() {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return null;
    }

    let supabaseClient = getSupabaseClient();

    function getSettings() {
      try {
        const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        return s || {};
      } catch (err) {
        return {};
      }
    }

    async function getCloudUserId() {
      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }
      if (!supabaseClient) return null;
      try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) return null;
        return data?.user?.id || null;
      } catch (err) {
        return null;
      }
    }

    let weights = [];
    try {
      const isNewUser = !localStorage.getItem(`uoft_user_${currentUser}_created`);
      if (isNewUser) {
        
        localStorage.setItem(`uoft_user_${currentUser}_created`, 'true');
      }

      
      const raw = localStorage.getItem(userGradeKey);
      if (!raw) {
        weights = [];
        localStorage.setItem(userGradeKey, JSON.stringify([]));
      } else {
        try {
          const parsed = JSON.parse(raw);
          weights = Array.isArray(parsed) ? parsed : [];
        } catch {
          weights = [];
        }
      }
    } catch {
      weights = [];
    }
    
    const savedWeights = localStorage.getItem(userGradeKey);
    if (savedWeights) {
      try {
        const parsed = JSON.parse(savedWeights);
        if (Array.isArray(parsed) && parsed.length > 0) {
          weights = parsed;
        }
      } catch {}
    }

    async function loadCourseFromCloud() {
      const userId = await getCloudUserId();
      if (!userId || !supabaseClient) return;

      const { data, error } = await supabaseClient
        .from(CLOUD_TABLE)
        .select('code, title, icon, grade, crncr, weights')
        .eq('user_id', userId)
        .eq('code', courseId)
        .maybeSingle();

      if (error || !data) return;

      if (data.title) courseMeta.title = data.title;
      if (data.icon) courseMeta.icon = data.icon;
      if (typeof data.crncr === 'boolean') courseMeta.crncr = data.crncr;

      if (Array.isArray(data.weights) && data.weights.length) {
        weights = data.weights;
        localStorage.setItem(userGradeKey, JSON.stringify(weights));
        renderTable();
      }
    }

    async function syncCourseToCloud(payload) {
      const userId = await getCloudUserId();
      if (!userId || !supabaseClient) return;

      const row = {
        user_id: userId,
        course_id: String(payload.code || '').toUpperCase(),
        code: String(payload.code || '').toUpperCase(),
        title: payload.title || '',
        icon: payload.icon || '',
        grade: typeof payload.grade === 'number' ? payload.grade : null,
        crncr: !!payload.crncr,
        weights: Array.isArray(payload.weights) ? payload.weights : [],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from(CLOUD_TABLE)
        .upsert(row, { onConflict: 'user_id,course_id' });

      if (error) {
        console.warn('Cloud sync failed:', error.message);
      }
    }


    function gpaFromPct(p) {
      if (p >= 90) return 4.0;
      if (p >= 85) return 4.0;
      if (p >= 80) return 3.7;
      if (p >= 77) return 3.3;
      if (p >= 73) return 3.0;
      if (p >= 70) return 2.7;
      if (p >= 67) return 2.3;
      if (p >= 63) return 2.0;
      if (p >= 60) return 1.7;
      if (p >= 57) return 1.3;
      if (p >= 53) return 1.0;
      if (p >= 50) return 0.7;
      return 0.0;
    }

    function letterFromPct(p) {
      if (p >= 90) return 'A+';
      if (p >= 85) return 'A';
      if (p >= 80) return 'A-';
      if (p >= 77) return 'B+';
      if (p >= 73) return 'B';
      if (p >= 70) return 'B-';
      if (p >= 67) return 'C+';
      if (p >= 63) return 'C';
      if (p >= 60) return 'C-';
      if (p >= 57) return 'D+';
      if (p >= 53) return 'D';
      if (p >= 50) return 'D-';
      return 'F';
    }

    function renderTable() {
      const table = document.querySelector('table');
      const tbody = document.getElementById('gradeBody');
      tbody.innerHTML = '';
      if (table) {
        table.classList.toggle('empty', weights.length === 0);
      }
      if (weights.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="empty-msg" colspan="5">
            No assessments yet. Click <span class="empty-cta">+ Add Assessment</span> to get started.
          </td>
        `;
        tbody.appendChild(tr);
        renderEstimates();
        calcAvg();
        return;
      }
      weights.forEach((w, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td data-edit="name" ondblclick="editName(${i}, this)">${w.name}</td>
          <td data-edit="weight" ondblclick="editWeight(${i}, this)">${w.weight}</td>
          <td><input type="number" min="0" max="100" step="0.01" value="${w.grade ?? ''}" data-i="${i}" data-type="grade"></td>
          <td><input type="number" min="0" max="100" step="0.01" value="${w.estimate ?? ''}" data-i="${i}" data-type="estimate"></td>
          <td><button class="remove-btn" onclick="removeAssessment(${i})"><ion-icon name="trash-outline"></ion-icon></button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelectorAll('td[data-edit]').forEach(cell => {
          addLongPressEdit(cell, i, cell.dataset.edit);
        });
      });

      document.querySelectorAll('input').forEach(inp => {
        const handleInput = (e) => {
          const i = e.target.dataset.i;
          const type = e.target.dataset.type;
          const raw = e.target.value.trim();

          if (raw === '') {
            weights[i][type] = null;
            calcAvg();
            scheduleAutoSave({ notify: type === 'grade' });
            return;
          }

          if (!/^(\d+)?(\.)?(\d{0,2})?$/.test(raw)) {
            return;
          }

          if (raw === '.' || raw.endsWith('.')) {
            return;
          }

          const num = parseFloat(raw);
          if (!isNaN(num)) {
            weights[i][type] = num;
            calcAvg();
            scheduleAutoSave({ notify: type === 'grade' });
          }
        };

        const handleBlur = (e) => {
          const i = e.target.dataset.i;
          const type = e.target.dataset.type;
          let raw = e.target.value.trim();

          if (raw === '' || raw === '.') {
            e.target.value = '';
            weights[i][type] = null;
            calcAvg();
            scheduleAutoSave({ notify: type === 'grade' });
            return;
          }

          let num = parseFloat(raw);
          if (isNaN(num)) {
            e.target.value = '';
            weights[i][type] = null;
            calcAvg();
            scheduleAutoSave({ notify: type === 'grade' });
            return;
          }

          if (num > 100) num = 100;
          if (num < 0) num = 0;
          num = Math.round(num * 100) / 100;

          const formatted = num.toFixed(2).replace(/\.?0+$/, '');
          e.target.value = formatted;
          weights[i][type] = num;
          calcAvg();
          scheduleAutoSave({ notify: type === 'grade' });
        };

        
        inp.addEventListener('input', handleInput);
        inp.addEventListener('blur', handleBlur);
        inp.addEventListener('paste', (e) => {
          requestAnimationFrame(() => handleBlur(e));
        });
      });
      renderEstimates();
      calcAvg();
    }

    function addLongPressEdit(cell, i, type) {
      if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
      let timer = null;
      let startX = 0;
      let startY = 0;
      const threshold = 8;
      const delay = 420;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      cell.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        clearTimer();
        timer = setTimeout(() => {
          if (type === 'name') editName(i, cell);
          if (type === 'weight') editWeight(i, cell);
        }, delay);
      }, { passive: true });

      cell.addEventListener('touchmove', (e) => {
        if (!timer || !e.touches.length) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if (dx > threshold || dy > threshold) {
          clearTimer();
        }
      }, { passive: true });

      cell.addEventListener('touchend', clearTimer);
      cell.addEventListener('touchcancel', clearTimer);
    }

    function addAssessment() {
      const newRow = {
        name: `Assessment ${weights.length + 1}`,
        weight: 10,
        grade: null,
        estimate: null
      };
      weights.push(newRow);
      renderTable();
      calcAvg();
      scheduleAutoSave({ notify: false });
    }

    let undoTimer = null;
    let pendingUndo = null;

    function hideUndoToast() {
      if (!undoToastEl) return;
      undoToastEl.classList.remove('show');
    }

    function showUndoAssessment(removed, index) {
      if (!undoToastEl || !undoBtnEl || !undoTextEl) return;
      if (undoTimer) clearTimeout(undoTimer);
      pendingUndo = { removed, index };
      undoTextEl.textContent = `${removed.name || 'Assessment'} removed.`;
      undoToastEl.classList.add('show');
      undoBtnEl.onclick = () => {
        if (!pendingUndo) return;
        const insertAt = Math.min(Math.max(pendingUndo.index, 0), weights.length);
        weights.splice(insertAt, 0, pendingUndo.removed);
        renderTable();
        calcAvg();
        scheduleAutoSave({ notify: false });
        pendingUndo = null;
        if (undoTimer) clearTimeout(undoTimer);
        hideUndoToast();
      };
      undoTimer = setTimeout(() => {
        pendingUndo = null;
        hideUndoToast();
      }, 4500);
    }

    function removeAssessment(i) {
      const removed = weights[i];
      weights.splice(i, 1);
      renderTable();
      calcAvg();
      scheduleAutoSave({ notify: false });
      if (removed) showUndoAssessment(removed, i);
    }

    function editWeight(i, cell) {
      const oldWeight = weights[i].weight;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = oldWeight;
      input.min = 0;
      input.max = 100;
      styleInlineEdit(input);
      cell.innerHTML = '';
      cell.appendChild(input);
      input.focus();

      input.addEventListener('blur', () => {
        const newWeight = parseFloat(input.value);
        if (!isNaN(newWeight) && newWeight >= 0 && newWeight <= 100) {
          weights[i].weight = newWeight;
          renderTable();
          calcAvg();
          scheduleAutoSave({ notify: false });
        } else cell.textContent = oldWeight;
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    }

    function editName(i, cell) {
      const oldName = weights[i].name;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldName;
      styleInlineEdit(input);
      input.style.textAlign = 'left';
      cell.innerHTML = '';
      cell.appendChild(input);
      input.focus();

      input.addEventListener('blur', () => {
        const newName = input.value.trim();
        if (newName) {
          weights[i].name = newName;
          renderTable();
          scheduleAutoSave({ notify: false });
        } else cell.textContent = oldName;
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    }

    function styleInlineEdit(input) {
      input.style.border = '2px solid var(--blue)';
      input.style.borderRadius = '6px';
      input.style.fontFamily = 'Outfit';
      input.style.fontSize = '15px';
      input.style.padding = '6px 8px';
    }

    function estimateTarget() {
      const settings = getSettings();
      const rawTarget = parseFloat(settings.estimateTarget);
      const targetValue = !isNaN(rawTarget) ? rawTarget : 85;
      const goal = isCreditCourse() ? 50 : targetValue;
      if (weights.length === 0) return;

      let weightedTotal = 0;
      let completedWeight = 0;
      let remainingWeight = 0;

      
      weights.forEach(w => {
        const weight = parseFloat(w.weight) || 0;
        const grade = parseFloat(w.grade);
        if (!isNaN(grade)) {
          weightedTotal += grade * weight;
          completedWeight += weight;
        } else {
          remainingWeight += weight;
        }
      });

      if (remainingWeight <= 0) return; 

      
      const neededAverage = (goal * (completedWeight + remainingWeight) - weightedTotal) / remainingWeight;

      
      weights.forEach(w => {
        if (w.grade == null || w.grade === '') {
          w.estimate = Math.max(0, Math.min(100, parseFloat(neededAverage.toFixed(2))));
        }
      });

      renderEstimates();
      calcAvg();
      scheduleAutoSave({ notify: false });
    }

    function renderEstimates() {
      const rows = document.querySelectorAll('#gradeBody tr');
      weights.forEach((w, i) => {
        const estimateInput = rows[i].querySelector('input[data-type="estimate"]');
        estimateInput.value = w.estimate ?? '';
      });
      calcAvg();
    }

    function calcAvg() {
      let total = 0, totalWeight = 0;
      weights.forEach(w => {
        if (w.grade != null && w.grade !== '') {
          total += (w.grade * w.weight);
          totalWeight += w.weight;
        }
      });
      const avg = totalWeight ? total / totalWeight : null;
      if (avg == null) {
        document.getElementById('avgDisplay').textContent = '—';
        document.getElementById('gpaDisplay').textContent = '—';
        document.getElementById('letterDisplay').textContent = '—';
      } else {
        document.getElementById('avgDisplay').textContent = avg.toFixed(1) + '%';
        const gpa = gpaFromPct(avg);
        const letter = letterFromPct(avg);
        document.getElementById('gpaDisplay').textContent = gpa.toFixed(2);
        document.getElementById('letterDisplay').textContent = letter;
        const gpaEl = document.getElementById('gpaDisplay');
        gpaEl.style.color =
          (letter === 'C+' || letter === 'C' || letter === 'C-' || letter.startsWith('D') || letter === 'F')
            ? '#dc2626'
            : '#22c55e';
      }

      
      try {
        const mainStateRaw = localStorage.getItem('uoft-grade-lite-v5');
        if (mainStateRaw) {
          const mainState = JSON.parse(mainStateRaw);
          if (mainState && Array.isArray(mainState.courses)) {
            const idx = mainState.courses.findIndex(c => (c.code || '').toUpperCase() === courseId);
            if (idx !== -1) {
              mainState.courses[idx].grade = avg == null ? null : avg;
              localStorage.setItem('uoft-grade-lite-v5', JSON.stringify(mainState));
            }
          }
        }
      } catch (e) {
        
      }
    }

    
    let autoSaveTimer = null;
    let autoSaveInFlight = false;
    let autoSaveNotify = false;

    function scheduleAutoSave({ notify = false } = {}) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveNotify = autoSaveNotify || notify;
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        if (autoSaveInFlight) return;
        autoSaveInFlight = true;
        saveCourseData({ notify: autoSaveNotify });
        autoSaveNotify = false;
        autoSaveInFlight = false;
      }, 650);
    }

    function saveCourseData(options = {}) {
      const { notify = true } = options;
      
      let total = 0, totalWeight = 0;
      weights.forEach(w => {
        if (w.grade != null && w.grade !== '') {
          total += (parseFloat(w.grade) * (parseFloat(w.weight) || 0));
          totalWeight += (parseFloat(w.weight) || 0);
        }
      });
      const avg = totalWeight ? total / totalWeight : null;

      
      const payload = {
        code: courseId,
        title: courseMeta.title || '',
        icon: courseMeta.icon || 'book-outline',
        crncr: !!courseMeta.crncr,
        grade: avg == null ? null : parseFloat(avg.toFixed(1)),
        gpa: avg == null ? null : gpaFromPct(avg),
        letter: avg == null ? null : letterFromPct(avg),
        weights: weights,
        updatedAt: new Date().toISOString()
      };

      
      const courseKey = `uoft_course_${currentUser}_${courseId}`;
      localStorage.setItem(courseKey, JSON.stringify(payload));

      
      localStorage.setItem(userGradeKey, JSON.stringify(weights));

      syncCourseToCloud(payload);

      
      if (notify) {
        const notif = document.getElementById('saveNotification');
        if (notif) {
          notif.textContent = 'Grades saved successfully!';
          notif.classList.add('show');
          setTimeout(() => notif.classList.remove('show'), 1600);
        }
      }

      
      calcAvg();
    }

    
    function saveGrades() {
      saveCourseData();
    }

    renderTable();
    loadCourseFromCloud();

    
    const THEME_KEY = 'uoft_theme'; 
    const themeToggle = document.getElementById('themeToggle');

    function applyTheme(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem(THEME_KEY, mode);
      themeToggle.setAttribute('name', mode === 'dark' ? 'sunny-outline' : 'moon-outline');
    }

    
    themeToggle.addEventListener('click', () => {
      const current = localStorage.getItem(THEME_KEY) || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });

    
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);

    
    window.addEventListener('storage', (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        applyTheme(e.newValue);
      }
      if (e.key === SETTINGS_KEY) {
        updateEstimateLabel();
      }
      if (e.key === 'uoft_estimate_target') {
        updateEstimateLabel();
      }
    });

  
