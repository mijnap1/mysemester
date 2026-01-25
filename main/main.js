
    
    const SETTINGS_KEY = 'uoft_settings_v1';
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
    
    const defaultSettings = {
      theme: 'light', 
      layout: 'compact', 
      gpaFormat: '4.0', 
      estimateTarget: '85',
      tutorial: false
    };
    function getSettings() {
      try {
        const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        return { ...defaultSettings, ...(s||{}) };
      } catch(e) { return { ...defaultSettings }; }
    }
    function saveSettings(settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    
    const openSettingsBtn = document.getElementById('openSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    const themeBtns = Array.from(document.querySelectorAll('.settings-theme-btn'));
    
    const layoutRadios = Array.from(document.querySelectorAll('.settings-layout-radio'));
    
    const gpaBtns = Array.from(document.querySelectorAll('.settings-gpa-btn'));
    const gpaSettingsCard = document.getElementById('gpaSettingsCard');
    const estimateBtns = Array.from(document.querySelectorAll('.settings-estimate-btn'));
    const estimateTargetInput = document.getElementById('estimateTargetInput');
    
    const exportCoursesBtn = document.getElementById('exportCoursesBtn');
    const importCoursesBtn = document.getElementById('importCoursesBtn');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const importCoursesFileInput = document.getElementById('importCoursesFile');

    
    if (gpaSettingsCard && !universityRules.showGpa) {
      gpaSettingsCard.style.display = 'none';
    }

    openSettingsBtn?.addEventListener('click', ()=>{
      settingsModal.showModal();
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      syncSettingsModalUI();
    });
    closeSettingsBtn?.addEventListener('click', ()=>settingsModal.close());
    settingsModal.addEventListener('close', ()=>{});
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') settingsModal.close?.();
    });

    
    function syncSettingsModalUI() {
      const s = getSettings();
      const storedTheme = localStorage.getItem(THEME_KEY) || s.theme || 'light';
      themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === storedTheme);
      });
      
      layoutRadios.forEach(r => {
        r.checked = r.value === s.layout;
      });
      
      gpaBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gpa === s.gpaFormat);
      });
      estimateBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.estimate === String(s.estimateTarget));
      });
      if (estimateTargetInput) {
        estimateTargetInput.value = s.estimateTarget || '85';
      }
    }

    
    function applyLayout() {
      try {
        const s = getSettings();
        const layout = (s.layout === 'spacious' || s.layout === 'compact') ? s.layout : 'compact';
        document.body.setAttribute('data-layout', layout);
      } catch (e) {
        document.body.setAttribute('data-layout', 'compact');
      }
    }

    
    document.addEventListener('DOMContentLoaded', applyLayout);

    
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newTheme = btn.dataset.theme;
        const s = getSettings();
        s.theme = newTheme;
        saveSettings(s);
        
        if (newTheme === 'system') {
          localStorage.setItem(THEME_KEY, 'system');
        } else {
          localStorage.setItem(THEME_KEY, newTheme);
        }
        applyTheme();
        syncSettingsModalUI();
      });
    });
    
    function applyTheme() {
      let stored = localStorage.getItem(THEME_KEY) || 'light';
      if (stored === 'system') {
        stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      if (stored === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.setAttribute('name','sunny-outline');
      } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.setAttribute('name','moon-outline');
      }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
      
      const s = getSettings();
      if(s.theme === 'system') applyTheme();
      syncSettingsModalUI();
    });

    
    layoutRadios.forEach(radio => {
      radio.addEventListener('change', ()=>{
        if (radio.checked) {
          const s = getSettings();
          s.layout = radio.value;
          saveSettings(s);
          applyLayout();
        }
      });
    });

    
    gpaBtns.forEach(btn => {
      btn.addEventListener('click', ()=>{
        const s = getSettings();
        s.gpaFormat = btn.dataset.gpa;
        saveSettings(s);
        syncSettingsModalUI();
      });
    });
    estimateBtns.forEach(btn => {
      btn.addEventListener('click', ()=>{
        const s = getSettings();
        s.estimateTarget = btn.dataset.estimate;
        saveSettings(s);
        localStorage.setItem('uoft_estimate_target', s.estimateTarget);
        syncSettingsModalUI();
      });
    });
    estimateTargetInput?.addEventListener('change', () => {
      const raw = parseFloat(estimateTargetInput.value);
      if (isNaN(raw)) return;
      const clamped = Math.max(50, Math.min(100, raw));
      const s = getSettings();
      s.estimateTarget = String(Math.round(clamped));
      saveSettings(s);
      localStorage.setItem('uoft_estimate_target', s.estimateTarget);
      syncSettingsModalUI();
    });
    saveSettingsBtn?.addEventListener('click', () => {
      const s = getSettings();
      if (estimateTargetInput) {
        const raw = parseFloat(estimateTargetInput.value);
        if (!isNaN(raw)) {
          const clamped = Math.max(50, Math.min(100, raw));
          s.estimateTarget = String(Math.round(clamped));
        }
      }
      saveSettings(s);
      localStorage.setItem('uoft_estimate_target', s.estimateTarget);
      syncSettingsModalUI();
      settingsModal.close();
    });



    
    
    exportCoursesBtn?.addEventListener('click', () => {
      try {
        
        if (!state || !Array.isArray(state.courses)) {
          alert('No courses to export.');
          return;
        }
        const auth = getAuth();
        const username = auth && auth.username ? auth.username : null;
        const coursesWithDetails = state.courses.map((course) => {
          const codeValue = String(course.code || '').toUpperCase();
          let weights = null;
          if (username && codeValue) {
            const weightsKey = `grades_${username}_${codeValue}_v3`;
            try {
              const raw = localStorage.getItem(weightsKey);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                  weights = parsed;
                }
              }
            } catch (_) {}
          }
          return {
            ...course,
            code: codeValue || course.code,
            weights
          };
        });
        const payload = {
          version: 2,
          exportedAt: new Date().toISOString(),
          courses: coursesWithDetails
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `mysemester-courses-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export error:', err);
        alert('Sorry, something went wrong while exporting your courses.');
      }
    });

    
    importCoursesBtn?.addEventListener('click', () => {
      if (!importCoursesFileInput) {
        alert('Import is not available in this environment.');
        return;
      }
      importCoursesFileInput.click();
    });

    
    importCoursesFileInput?.addEventListener('change', (e) => {
      const file = importCoursesFileInput.files && importCoursesFileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result;
          const parsed = JSON.parse(text);
          
          const rawCourses = Array.isArray(parsed?.courses)
            ? parsed.courses
            : (Array.isArray(parsed) ? parsed : null);

          if (!rawCourses) {
            alert('This file does not look like a valid MySemester export.');
            return;
          }
          if (!rawCourses.length) {
            alert('No courses were found in this file.');
            return;
          }

          
          const imported = rawCourses.map((c) => {
            const codeStr = (c.code || '').toString().trim().toUpperCase();
            return {
              id: c.id || uid(),
              code: codeStr || 'COURSE',
              title: (c.title || '').toString(),
              icon: c.icon || autoIcon(codeStr || 'COURSE', 'book-outline'),
              grade: (() => {
                const g = typeof c.grade === 'number' ? c.grade : parseFloat(c.grade);
                if (isNaN(g)) return 0;
                return Math.max(0, Math.min(100, g));
              })(),
              crncr: !!c.crncr,
              weights: Array.isArray(c.weights) ? c.weights : null
            };
          });

          if (!confirm(`Import ${imported.length} courses? This will replace your current list.`)) {
            return;
          }

          
          state.courses = imported.map(({ weights, ...course }) => course);
          save();
          render();

          
          const auth = getAuth();
          if (auth && auth.username) {
            imported.forEach((course) => {
              const codeValue = String(course.code || '').toUpperCase();
              if (!codeValue || !Array.isArray(course.weights)) return;
              const weightsKey = `grades_${auth.username}_${codeValue}_v3`;
              localStorage.setItem(weightsKey, JSON.stringify(course.weights));
            });
          }

          alert('Courses imported successfully.');
        } catch (err) {
          console.error('Import error:', err);
          alert('Could not read this file. Please make sure it is a valid MySemester export.');
        } finally {
          
          importCoursesFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });

    
    resetDataBtn?.addEventListener('click', () => {
      if (!confirm('Are you sure you want to reset ALL data for this account? This cannot be undone.')) {
        return;
      }
      try {
        
        const coursesKey = getUserSpecificKey(LS_KEY);
        localStorage.removeItem(coursesKey);
        
        const auth = getAuth();
        if (auth && auth.username) {
          const prefix = `grades_${auth.username}_`;
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith(prefix)) localStorage.removeItem(k);
          });
        }
        
        localStorage.removeItem(SETTINGS_KEY);

        
        state = { courses: [] };
        save();
        render();
        alert('All data for this account has been reset.');
      } catch (err) {
        console.error('Reset error:', err);
        alert('Something went wrong while resetting data.');
      }
    });
    

    
    const openAboutBtn = document.getElementById('openAbout');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('closeAbout');
    openAboutBtn?.addEventListener('click', () => {
      aboutModal.showModal();
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
    closeAboutBtn?.addEventListener('click', ()=>aboutModal.close());
    aboutModal.addEventListener('close', ()=>{});
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') aboutModal.close?.();
    });
    

    
    const LS_KEY = 'uoft-grade-lite-v5';
    
    function getUserSpecificKey(baseKey) {
      const auth = getAuth();
      if (auth && auth.loggedIn && auth.username) {
        return `${baseKey}-${auth.username}`;
      }
      return baseKey;
    }
    const AUTH_KEY = 'uoft_auth_v1';
    const THEME_KEY = 'uoft_theme';
    const CLOUD_TABLE = 'mysemester_courses';
    let supabaseClient = window.mysemesterSupabase || null;
    let cloudReady = false;
    let cloudSyncPending = false;
    let cloudSyncTimer = null;
    let suppressCloudSync = false;
    const cloudOverlay = document.getElementById('cloudSyncOverlay');
    let cloudOverlayTimeout = null;
    let cloudInitAttempts = 0;
    const CLOUD_INIT_MAX = 10;

    function setCloudOverlay(isVisible) {
      if (!cloudOverlay) return;
      if (cloudOverlayTimeout) {
        clearTimeout(cloudOverlayTimeout);
        cloudOverlayTimeout = null;
      }
      if (isVisible) {
        cloudOverlay.classList.add('show');
        cloudOverlay.setAttribute('aria-hidden', 'false');
        return;
      }
      cloudOverlayTimeout = setTimeout(() => {
        cloudOverlay.classList.remove('show');
        cloudOverlay.setAttribute('aria-hidden', 'true');
      }, 250);
    }

    function ensureSupabaseClient() {
      if (!supabaseClient && window.mysemesterSupabase) {
        supabaseClient = window.mysemesterSupabase;
      }
      return supabaseClient;
    }

    
    let state = { courses: [] };

    const uid = () => Math.random().toString(36).slice(2,9);

    
    function getCurrentUserKey() {
      const auth = getAuth();
      if (auth && auth.loggedIn && auth.username) {
        return `mysemester_courses_${auth.username}`;
      }
      return null;
    }

    function load(){
      let raw = null;
      try {
        raw = localStorage.getItem(getUserSpecificKey(LS_KEY));
      } catch(_){}
      if (raw) {
        try { state = JSON.parse(raw) || {courses:[]}; } catch(_) { state = {courses:[]}; }
      } else {
        
        state = { courses: [] };
        save();
      }
    }

    function save(){
      localStorage.setItem(getUserSpecificKey(LS_KEY), JSON.stringify(state));
      if (!suppressCloudSync) {
        queueCloudSync();
      }
    }

    async function getCloudUserId() {
      if (!ensureSupabaseClient()) return null;
      try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) return null;
        return data?.user?.id || null;
      } catch (err) {
        return null;
      }
    }

    function queueCloudSync() {
      if (!ensureSupabaseClient()) return;
      if (!cloudReady) {
        cloudSyncPending = true;
        return;
      }
      if (cloudSyncTimer) {
        clearTimeout(cloudSyncTimer);
      }
      cloudSyncTimer = setTimeout(() => {
        syncCoursesToCloud();
      }, 600);
    }

    async function syncCoursesToCloud() {
      if (!ensureSupabaseClient()) return;
      const userId = await getCloudUserId();
      if (!userId) return;

      const payload = (state.courses || []).map((course) => ({
        user_id: userId,
        course_id: String(course.code || '').toUpperCase(),
        code: String(course.code || '').toUpperCase(),
        title: course.title || '',
        icon: course.icon || '',
        grade: typeof course.grade === 'number' ? course.grade : null,
        crncr: !!course.crncr,
        updated_at: new Date().toISOString()
      }));

      if (!payload.length) {
        await supabaseClient
          .from(CLOUD_TABLE)
          .delete()
          .eq('user_id', userId);
        return;
      }

      const { error: upsertError } = await supabaseClient
        .from(CLOUD_TABLE)
        .upsert(payload, { onConflict: 'user_id,course_id' });

      if (upsertError) {
        console.warn('Cloud sync failed:', upsertError.message);
        return;
      }

      const { data: remoteRows, error: selectError } = await supabaseClient
        .from(CLOUD_TABLE)
        .select('course_id')
        .eq('user_id', userId);

      if (selectError || !remoteRows) return;

      const localIds = new Set(payload.map((row) => row.course_id));
      const toDelete = remoteRows
        .map((row) => row.course_id)
        .filter((id) => id && !localIds.has(id));

      if (toDelete.length) {
        await supabaseClient
          .from(CLOUD_TABLE)
          .delete()
          .eq('user_id', userId)
          .in('course_id', toDelete);
      }
    }

    async function loadFromCloud() {
      if (!ensureSupabaseClient()) return false;
      const userId = await getCloudUserId();
      if (!userId) return false;

      const { data, error } = await supabaseClient
        .from(CLOUD_TABLE)
        .select('course_id, code, title, icon, grade, crncr')
        .eq('user_id', userId);

      if (error || !data) return false;

      if (data.length) {
        const localCourses = Array.isArray(state.courses) ? state.courses : [];
        const localMap = new Map();
        const localOrder = [];

        localCourses.forEach((course) => {
          const codeValue = String(course.code || course.id || '').toUpperCase();
          if (!codeValue) return;
          localOrder.push(codeValue);
          localMap.set(codeValue, {
            id: codeValue,
            code: codeValue,
            title: course.title || '',
            icon: course.icon || 'book-outline',
            grade: typeof course.grade === 'number' ? course.grade : (Number.isFinite(parseFloat(course.grade)) ? parseFloat(course.grade) : null),
            crncr: !!course.crncr
          });
        });

        const cloudMap = new Map();
        data.forEach((row) => {
          const codeValue = String(row.code || row.course_id || '').toUpperCase();
          if (!codeValue) return;
          cloudMap.set(codeValue, {
            id: codeValue,
            code: codeValue,
            title: row.title || '',
            icon: row.icon || 'book-outline',
            grade: typeof row.grade === 'number' ? row.grade : (Number.isFinite(parseFloat(row.grade)) ? parseFloat(row.grade) : null),
            crncr: !!row.crncr
          });
        });

        let needsUpload = false;
        const mergedOrder = [...localOrder];

        cloudMap.forEach((cloudCourse, codeValue) => {
          const localCourse = localMap.get(codeValue);
          if (localCourse) {
            localMap.set(codeValue, {
              id: codeValue,
              code: codeValue,
              title: localCourse.title || cloudCourse.title || '',
              icon: localCourse.icon || cloudCourse.icon || 'book-outline',
              grade: typeof localCourse.grade === 'number' ? localCourse.grade : (Number.isFinite(parseFloat(cloudCourse.grade)) ? parseFloat(cloudCourse.grade) : null),
              crncr: typeof localCourse.crncr === 'boolean' ? localCourse.crncr : !!cloudCourse.crncr
            });
          } else {
            localMap.set(codeValue, cloudCourse);
            mergedOrder.push(codeValue);
          }
        });

        const cloudCodes = new Set(cloudMap.keys());
        localMap.forEach((_, codeValue) => {
          if (!cloudCodes.has(codeValue)) {
            needsUpload = true;
          }
        });

        state.courses = mergedOrder.map((codeValue) => localMap.get(codeValue)).filter(Boolean);

        suppressCloudSync = true;
        save();
        suppressCloudSync = false;

        if (needsUpload) {
          queueCloudSync();
        }

        return true;
      }

      return false;
    }

    function initCloudSync() {
      const auth = getAuth();
      if (!auth || !auth.loggedIn) {
        cloudReady = true;
        return;
      }
      if (!ensureSupabaseClient()) {
        cloudInitAttempts += 1;
        if (cloudInitAttempts <= CLOUD_INIT_MAX) {
          setTimeout(initCloudSync, 300);
        } else {
          cloudReady = true;
        }
        return;
      }
      setCloudOverlay(true);
      loadFromCloud().then((loaded) => {
        cloudReady = true;
        if (loaded) {
          render();
        } else if (state.courses.length) {
          queueCloudSync();
        }
        if (cloudSyncPending) {
          cloudSyncPending = false;
          queueCloudSync();
        }
      }).finally(() => {
        setCloudOverlay(false);
      });
    }



    
    function getAuth(){
      try{
        const a = JSON.parse(localStorage.getItem(AUTH_KEY));
        return a && a.loggedIn ? a : { loggedIn: false };
      } catch(e){ return { loggedIn:false }; }
    }
    function setAuth(a){ localStorage.setItem(AUTH_KEY, JSON.stringify(a)); }

    
    
    function getDisplayName() {
      const auth = getAuth();
      let prof = null;
      try {
        
        if (typeof loadProfile === 'function') prof = loadProfile();
      } catch(_){}

      const nickname = prof && typeof prof.nickname === 'string' ? prof.nickname.trim() : '';
      const fullnameFromProfile = prof && typeof prof.name === 'string' ? prof.name.trim() : '';
      const fullNameFromAuth = auth && typeof auth.fullName === 'string' ? auth.fullName.trim() : '';
      const username = auth && typeof auth.username === 'string' ? auth.username.trim() : '';

      return nickname || fullnameFromProfile || fullNameFromAuth || username || 'User';
    }

    
    function applyTheme() {
      const stored = localStorage.getItem(THEME_KEY) || 'light';
      if (stored === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.setAttribute('name','sunny-outline');
      } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.setAttribute('name','moon-outline');
      }
    }

    
    function letterFromPct(p){
      if(p>=90) return 'A+'; if(p>=85) return 'A'; if(p>=80) return 'A-';
      if(p>=77) return 'B+'; if(p>=73) return 'B'; if(p>=70) return 'B-';
      if(p>=67) return 'C+'; if(p>=63) return 'C'; if(p>=60) return 'C-';
      if(p>=57) return 'D+'; if(p>=53) return 'D'; if(p>=50) return 'D-';
      return 'F';
    }
    function gpaFromPct(p){
      if(p>=90) return 4.0; if(p>=85) return 4.0; if(p>=80) return 3.7; if(p>=77) return 3.3;
      if(p>=73) return 3.0; if(p>=70) return 2.7; if(p>=67) return 2.3; if(p>=63) return 2.0;
      if(p>=60) return 1.7; if(p>=57) return 1.3; if(p>=53) return 1.0; if(p>=50) return 0.7;
      return 0.0;
    }

    function recomputeOverview(){
      const counted = state.courses.filter(c => !(universityRules.creditAllowed && c.crncr));
      const graded = counted.filter(c => typeof c.grade === 'number' && !isNaN(c.grade));
      if(!graded.length){
        gpa4.textContent='—';
        gpaLetter.textContent='—';
        gpaPct.textContent='—';
        return;
      }
      const av = graded.reduce((s,c)=> s + c.grade, 0) / graded.length;
      gpa4.textContent = gpaFromPct(av).toFixed(2);
      gpaLetter.textContent = letterFromPct(av);
      gpaPct.textContent = Math.round(av) + '%';
    }

    
    const grid = document.getElementById('courseGrid');
    const gpa4 = document.getElementById('gpa4');
    const gpaLetter = document.getElementById('gpaLetter');
    const gpaPct = document.getElementById('gpaPct');
    const gpa4Wrap = gpa4 ? gpa4.closest('.ov') : null;
    const gpaLetterWrap = gpaLetter ? gpaLetter.closest('.ov') : null;
    if (gpa4Wrap) gpa4Wrap.style.display = universityRules.showGpa ? '' : 'none';
    if (gpaLetterWrap) gpaLetterWrap.style.display = universityRules.showLetter ? '' : 'none';

    function render(){
      grid.innerHTML='';
      if (!state.courses.length) {
        
        const empty = document.createElement('div');
        empty.className = 'empty-state-card';
        empty.innerHTML = `
          <div class="empty-plus-badge">
            <ion-icon name="add-outline"></ion-icon>
          </div>
          <div class="empty-title">No courses yet</div>
          <div class="empty-desc">Start by adding your first course to track your grades!</div>
          <button type="button" class="btn-empty-pill" id="emptyAddCourseBtn"><ion-icon name="add-outline"></ion-icon> Add Course</button>
        `;
        grid.appendChild(empty);
        document.getElementById('emptyAddCourseBtn').addEventListener('click', ()=>{
          editingId = null;
          modalTitle.textContent = 'Add Course';
          addCourseForm.reset();
          iconPreview.setAttribute('name','book-outline');
          addCourseModal.showModal();
        });
      } else {
        for(const c of state.courses){
          
          const auth = getAuth();
          const username = auth && auth.username ? auth.username : "guest";
          const gradeKey = `grades_${username}_${c.code}_v3`;
          const storedGradesRaw = localStorage.getItem(gradeKey);
          if (storedGradesRaw) {
            try {
              const assessments = JSON.parse(storedGradesRaw);
              if (Array.isArray(assessments)) {
                if (assessments.length > 0) {
                  let totalWeighted = 0, totalWeight = 0;
                  assessments.forEach(a => {
                    if (a.grade != null && !isNaN(a.grade)) {
                      totalWeighted += a.grade * (a.weight || 0);
                      totalWeight += (a.weight || 0);
                    }
                  });
                  if (totalWeight > 0) {
                    c.grade = totalWeighted / totalWeight;
                  } else {
                    c.grade = null;
                  }
                } else {
                  c.grade = null;
                }
              } else {
                c.grade = null;
              }
            } catch(e) { console.error("Error parsing grades for", c.code, e); }
          } else if (c.grade === 0) {
            c.grade = null;
          }

          const card = document.createElement('div');
          card.className = 'card';
          card.dataset.id = c.id;

          const markId = 'm_'+c.id;
          const creditLabel = universityRules.creditLabel || 'CR/NCR';
          const creditEnabled = universityRules.creditAllowed && c.crncr;
          const hasGrade = typeof c.grade === 'number' && !isNaN(c.grade);
          const gradeText = hasGrade ? `${Math.round(c.grade)}%` : '—';
          card.innerHTML = `
            <ion-icon class="course-icon" name="${c.icon}"></ion-icon>
            <div class="info">
              <div class="code">${c.code}</div>
              <div class="muted-sm">
                ${c.title || ''}
                ${creditEnabled ? `<span class="tag-crncr">${creditLabel}</span>` : ''}
              </div>
            </div>
            <div class="mark"><span class="swap" id="${markId}">${gradeText}</span></div>
          `;

          
          card.addEventListener('contextmenu', (e)=> openCtx(e, c.id));

          
          card.addEventListener('click', () => {
            const courseData = {
              code: c.code,
              title: c.title || '',
              icon: c.icon || 'book-outline',
              crncr: universityRules.creditAllowed && !!c.crncr   
            };
            localStorage.setItem('selectedCourse', JSON.stringify(courseData));
            window.location.href = `/grade/?course=${encodeURIComponent(c.code)}`;
          });

          grid.appendChild(card);
          if (hasGrade) {
            startSwap(document.getElementById(markId), c.grade);
          }
        }
      }
      recomputeOverview();
    }

    
    const swapTimers = new Map();
    function startSwap(el, pct){
      if(!el) return;
      if(swapTimers.has(el)) clearInterval(swapTimers.get(el));
      if (!universityRules.showLetter) {
        el.textContent = Math.round(pct) + '%';
        return;
      }
      let showingPct = true;
      const update = ()=>{
        el.style.opacity = 0;
        setTimeout(()=>{
          el.textContent = showingPct ? letterFromPct(pct) : Math.round(pct)+'%';
          showingPct = !showingPct;
          el.style.opacity = 1;
        }, 300);
      };
      const t = setInterval(update, 6000);
      swapTimers.set(el, t);
    }

    
    const ctx = document.getElementById('ctxMenu');
    const ctxCrncrLabelEl = document.getElementById('ctxCrncrLabel');
    const ctxCrncrBtn = ctx ? ctx.querySelector('button[data-act="crncr"]') : null;
    let ctxCourseId = null;
    function openCtx(e, id){
      e.preventDefault();
      ctxCourseId = id;

      
      const course = state.courses.find(c => c.id === id);
      if (ctxCrncrBtn && !universityRules.creditAllowed) {
        ctxCrncrBtn.style.display = 'none';
      } else if (ctxCrncrBtn) {
        ctxCrncrBtn.style.display = 'flex';
        const creditLabel = universityRules.creditLabel || 'CR/NCR';
        if (course && course.crncr) {
          if (ctxCrncrLabelEl) ctxCrncrLabelEl.textContent = `Remove ${creditLabel}`;
        } else {
          if (ctxCrncrLabelEl) ctxCrncrLabelEl.textContent = `Set ${creditLabel}`;
        }
      }

      positionCtx(e.clientX, e.clientY);
      ctx.classList.add('show');
      document.addEventListener('click', onDocClickClose, { once:true });
    }
    function positionCtx(x,y){
      const pad = 8; const w = ctx.offsetWidth || 200; const h = ctx.offsetHeight || 140;
      const vw = window.innerWidth, vh = window.innerHeight; let left = x, top = y;
      if(left + w + pad > vw) left = vw - w - pad; if(top + h + pad > vh) top = vh - h - pad;
      ctx.style.left = left + 'px'; ctx.style.top = top + 'px';
    }
    function onDocClickClose(){ ctx.classList.remove('show'); }

    ctx.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return; const act = btn.dataset.act; ctx.classList.remove('show');
      if(act==='del') removeCourse(ctxCourseId);
      if(act==='dup') duplicateCourse(ctxCourseId);
      if(act==='edit') editCourse(ctxCourseId);
      if(act==='crncr') toggleCrncr(ctxCourseId);
    });

    function removeCourse(id){
      const card = [...document.querySelectorAll('.card')].find(c=>c.dataset.id===id);
      if(!confirm('Remove this course?')) return;
      if(card){ card.classList.add('fade-out'); setTimeout(()=>{
        state.courses = state.courses.filter(c=>c.id!==id); save(); render();
      }, 260); }
      else { state.courses = state.courses.filter(c=>c.id!==id); save(); render(); }
    }
    function duplicateCourse(id){
      const c = state.courses.find(x=>x.id===id); if(!c) return;
      const copy = { ...c, id: uid(), code: c.code+" (copy)" };
      state.courses.push(copy); save(); render();
    }
    function editCourse(id){
      const c = state.courses.find(x=>x.id===id); if(!c) return; editingId = id;
      modalTitle.textContent = 'Edit Course';
      codeInput.value = c.code; titleInput.value = c.title; gradeInput.value = c.grade ?? '';
      iconInput.value = c.icon; iconPreview.setAttribute('name', c.icon);
      addCourseModal.showModal();
    }
    function toggleCrncr(id){
      if (!universityRules.creditAllowed) return;
      const c = state.courses.find(x=>x.id===id);
      if(!c) return;
      c.crncr = !c.crncr;
      save();
      render();
    }

    
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openAddCourse = document.getElementById('openAddCourse');

    const addCourseModal = document.getElementById('addCourseModal');
    const addCourseForm = document.getElementById('addCourseForm');
    const cancelCourse = document.getElementById('cancelCourse');
    const iconInput = document.getElementById('iconInput');
    const iconPreview = document.getElementById('iconPreview');
    const formError = document.getElementById('formError');
    const modalTitle = document.getElementById('modalTitle');
    const gradeInput = document.getElementById('gradeInput');
    const codeInput = document.getElementById('codeInput');
    const titleInput = document.getElementById('titleInput');
    let editingId = null;

    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      ctx.classList.remove('show');
      accountDd.classList.remove('show');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        addCourseModal.close?.();
        ctx.classList.remove('show');
        accountDd.classList.remove('show');
      }
    });

    openAddCourse.addEventListener('click', ()=>{
      editingId = null; modalTitle.textContent = 'Add Course';
      addCourseForm.reset(); iconPreview.setAttribute('name','book-outline');
      addCourseModal.showModal();
    });

    cancelCourse.addEventListener('click', ()=>{
      addCourseModal.close(); formError.style.display='none';
    });
    iconInput.addEventListener('input', ()=>{
      iconPreview.setAttribute('name', iconInput.value.trim()||'book-outline');
    });

    
    document.getElementById('iconChipRow')?.addEventListener('click', function(e){
      const chip = e.target.closest('.icon-chip');
      if (!chip) return;
      const icon = chip.getAttribute('data-icon');
      if (icon) {
        iconInput.value = icon;
        iconPreview.setAttribute('name', icon);
        iconInput.focus();
      }
    });

    
    (function() {
      const tryToggle = document.getElementById('iconTryToggle');
      const chipRow = document.getElementById('iconChipRow');
      if (!tryToggle || !chipRow) return;
      let shown = false;
      function showChips() {
        chipRow.classList.remove('hide');
        chipRow.setAttribute('aria-hidden', 'false');
        tryToggle.setAttribute('aria-expanded', 'true');
        shown = true;
      }
      function hideChips() {
        chipRow.classList.add('hide');
        chipRow.setAttribute('aria-hidden', 'true');
        tryToggle.setAttribute('aria-expanded', 'false');
        shown = false;
      }
      function toggleChips() {
        if (shown) {
          hideChips();
        } else {
          showChips();
        }
      }
      tryToggle.addEventListener('click', toggleChips);
      tryToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          toggleChips();
        }
      });
      
      hideChips();
    })();

    
    const codeTitlePlaceholders = [
      { code: 'MAT101', title: 'Calculus 1' },
      { code: 'PSY100', title: 'Introduction to Psychology' },
      { code: 'ECO101', title: 'Microeconomics' },
      { code: 'PHY101', title: 'Mechanics' },
      { code: 'BIO100', title: 'Introduction to Biology' },
    ];
    let phIndex = 0;
    function rotatePlaceholders() {
      phIndex = (phIndex + 1) % codeTitlePlaceholders.length;
      codeInput.setAttribute('placeholder', codeTitlePlaceholders[phIndex].code);
      titleInput.setAttribute('placeholder', codeTitlePlaceholders[phIndex].title);
    }
    setInterval(rotatePlaceholders, 3200);
    
    codeInput.setAttribute('placeholder', codeTitlePlaceholders[0].code);
    titleInput.setAttribute('placeholder', codeTitlePlaceholders[0].title);

    addCourseForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const code = codeInput.value.trim();
      const title = titleInput.value.trim();
      const gradeRaw = gradeInput.value.trim();
      const icon = (iconInput.value.trim()||'book-outline');

      if(!code){ formError.style.display='block'; return; } else { formError.style.display='none'; }
      const normCode = code.toUpperCase();
      const grade = gradeRaw === '' ? null : Math.max(0, Math.min(100, parseFloat(gradeRaw)));

      if(editingId){
        const c = state.courses.find(x=>x.id===editingId);
        if(c){ c.code = normCode; c.title = title; c.icon = autoIcon(normCode, icon); c.grade = grade; }
      } else {
        state.courses.push({ id: uid(), code: normCode, title, icon: autoIcon(normCode, icon), grade: grade ?? null, crncr: false });
      }
      save(); render(); addCourseModal.close(); sidebar.classList.remove('show'); overlay.classList.remove('show');
      
      window.dispatchEvent(new Event("storage"));
    });
    
    window.addEventListener("storage", (e) => {
      if (!e || !e.key || e.key.includes("courses") || e.key.includes(LS_KEY) || e.key === "uoft_last_update") {
        const userAuth = JSON.parse(localStorage.getItem("uoft_auth_v1"));
        if (!userAuth) return;
        const key = getUserSpecificKey(LS_KEY);
        const updatedStateRaw = localStorage.getItem(key);
        let updatedCourses = [];
        if (updatedStateRaw) {
          try { updatedCourses = JSON.parse(updatedStateRaw).courses || []; } catch(e) { updatedCourses = []; }
        }
        state.courses = updatedCourses;
        render();
        console.log("Synced latest grades across tabs/pages");
      }
    });

    
    function loadCoursesFromStorage() {
      const userAuth = JSON.parse(localStorage.getItem("uoft_auth_v1"));
      const username = userAuth && userAuth.username ? userAuth.username : "guest";
      const allKeys = Object.keys(localStorage);
      const courseKeys = allKeys.filter(k => k.startsWith(`uoft_course_${username}_`));
      
      
    }
    function autoIcon(code, fallback){
      
      if(/^CSC/i.test(code)) return 'laptop-outline';      
      if(/^MAT/i.test(code)) return 'calculator-outline';  
      if(/^STA/i.test(code)) return 'stats-chart-outline'; 
      if(/^AST/i.test(code)) return 'planet-outline';      
      if(/^PHL|PHI/i.test(code)) return 'school-outline';  
      return fallback || 'book-outline';
    }

    
    const accountBtn = document.getElementById('accountBtn');
    const accountDd = document.getElementById('accountDd');
    const accName = document.getElementById('accName');
    const accEmail = document.getElementById('accEmail');
    const accSummary = document.getElementById('accSummary');
    const accActionsSignedOut = document.getElementById('accActionsSignedOut');
    const accActionsSignedIn = document.getElementById('accActionsSignedIn');
    const signOutBtn = document.getElementById('signOut');
    const goProfile = document.getElementById('goProfile');
    
    goProfile?.addEventListener('click', () => {
      accountDd.classList.remove('show');
      openProfileModal(); 
    });
    accSummary?.addEventListener('click', () => {
      accountDd.classList.remove('show');
      openProfileModal();
    });
    const chipWelcome = document.getElementById('chipWelcome');
    const welcomeTitle = document.getElementById('welcomeTitle');

    accountBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      accountDd.classList.toggle('show');
    });
    document.addEventListener('click', (e)=>{
      if(!accountDd.contains(e.target) && e.target !== accountBtn){
        accountDd.classList.remove('show');
      }
    });

    function refreshAuthUI(){
      const auth = getAuth();
      if(auth.loggedIn){
        const name = getDisplayName();
        accName.textContent = name;
        accEmail.textContent = auth.email || 'Signed in';
        accActionsSignedOut.style.display = 'none';
        accActionsSignedIn.style.display = '';
        chipWelcome.textContent = `Welcome, ${name}`;
        welcomeTitle.textContent = `Welcome, ${name}`;
      } else {
        accName.textContent = 'Guest';
        accEmail.textContent = 'Not signed in';
        accActionsSignedOut.style.display = '';
        accActionsSignedIn.style.display = 'none';
        chipWelcome.textContent = 'Welcome';
        welcomeTitle.textContent = 'Welcome';
      }
    }

    signOutBtn?.addEventListener('click', ()=>{
      setAuth({ loggedIn:false });
      refreshAuthUI();
      accountDd.classList.remove('show');
      window.location.href = '/login/'; 
    });

    




    
    
    const profileModal = document.getElementById('profileModal');
    const profileForm = document.getElementById('profileForm');
    const profilePicInput = document.getElementById('profilePicInput');
    const profilePicPreview = document.getElementById('profilePicPreview');
    const profileNameInput = document.getElementById('profileNameInput');
    const profileNickInput = document.getElementById('profileNickInput');
    const profileEmailInput = document.getElementById('profileEmailInput');
    const profilePasswordInput = document.getElementById('profilePasswordInput');
    const profileCancelBtn = document.getElementById('profileCancelBtn');
    const profileUniversityInput = document.getElementById('profileUniversityInput');
    const profileYearSelect = document.getElementById('profileYearSelect');
    const profileYearWrap = document.getElementById('profileYearWrap');
    const profileYearButton = document.getElementById('profileYearButton');
    const profileYearMenu = document.getElementById('profileYearMenu');
    const profileProgramInput = document.getElementById('profileProgramInput');
    const profileProgramWrap = document.getElementById('profileProgramWrap');
    const profileProgramButton = document.getElementById('profileProgramButton');
    const profileProgramMenu = document.getElementById('profileProgramMenu');
    const sidebarUniversityEl = document.getElementById('sidebarUniversity');
    const sidebarYearEl = document.getElementById('sidebarYear');
    const sidebarProgramEl = document.getElementById('sidebarProgram');

    
    function getProfileUserKey() {
      const auth = getAuth();
      if (auth && auth.username) {
        return `mysemester_user_${auth.username}`;
      }
      return null;
    }

    
    function loadProfile() {
      const auth = getAuth();
      if (!auth.loggedIn) return null;
      const userKey = getProfileUserKey();
      let profile = null;
      try {
        profile = JSON.parse(localStorage.getItem(userKey));
      } catch (e) {}
      
      if (!profile) {
        profile = {
          picture: "",
          name: auth.username || "",
          nickname: "",
          email: auth.email || "",
          password: ""
        };
      }
      return profile;
    }

    function syncSidebarProfile() {
      let setup = null;
      try {
        setup = JSON.parse(localStorage.getItem('uoft_onboarding_v1') || 'null');
      } catch (err) {
        setup = null;
      }
      if (sidebarUniversityEl) {
        sidebarUniversityEl.textContent = setup?.university || 'Not set';
      }
      if (sidebarYearEl) {
        sidebarYearEl.textContent = setup?.year || 'Not set';
      }
      if (sidebarProgramEl) {
        sidebarProgramEl.textContent = setup?.program || 'Not set';
      }
    }

    
    function saveProfile(profile) {
      const userKey = getProfileUserKey();
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(profile));
      }
    }

    
    function openProfileModal() {
      const profile = loadProfile();
      if (!profile) return;
      let setup = null;
      try {
        setup = JSON.parse(localStorage.getItem('uoft_onboarding_v1') || 'null');
      } catch (err) {
        setup = null;
      }
      if (profileUniversityInput) {
        profileUniversityInput.value = setup?.university || '';
      }
      if (profileYearSelect) {
        profileYearSelect.value = setup?.year || '';
      }
      if (profileProgramInput) {
        profileProgramInput.value = setup?.program || '';
      }
      if (profileYearButton) {
        profileYearButton.textContent = profileYearSelect?.value || 'Select year';
      }
      if (profileYearMenu) {
        profileYearMenu.querySelectorAll('.profile-select-option').forEach(btn => {
          btn.classList.toggle('is-selected', btn.dataset.value === profileYearSelect?.value);
        });
      }
      if (profileProgramButton) {
        profileProgramButton.textContent = profileProgramInput?.value || 'Select program';
      }
      if (profileProgramMenu) {
        profileProgramMenu.querySelectorAll('.profile-select-option').forEach(btn => {
          btn.classList.toggle('is-selected', btn.dataset.value === profileProgramInput?.value);
        });
      }
      profilePicPreview.src = profile.picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(profile.name || profile.nickname || "U");
      profileNameInput.value = profile.name || "";
      profileNickInput.value = profile.nickname || "";
      profileEmailInput.value = profile.email || "";
      profilePasswordInput.value = profile.password || "";
      profilePicInput.value = "";
      profileModal.showModal();
    }

    
    profilePicInput?.addEventListener('change', function(e) {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          profilePicPreview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const prevProfile = loadProfile() || {};
        const newProfile = {
          picture: profilePicPreview.src || prevProfile.picture || "",
          
          name: (profileNameInput.value.trim()) || prevProfile.name || (getAuth().fullName || "") || (getAuth().username || ""),
          nickname: (profileNickInput.value.trim()) || prevProfile.nickname || "",
          email: (profileEmailInput.value.trim()) || prevProfile.email || (getAuth().email || ""),
          password: profilePasswordInput.value || prevProfile.password || ""
        };

        saveProfile(newProfile);
        try {
          const setup = JSON.parse(localStorage.getItem('uoft_onboarding_v1') || 'null') || {};
          const nextSetup = {
            ...setup,
            university: profileUniversityInput?.value?.trim() || setup.university || '',
            year: profileYearSelect?.value || setup.year || '',
            program: profileProgramInput?.value?.trim() || setup.program || ''
          };
          localStorage.setItem('uoft_onboarding_v1', JSON.stringify(nextSetup));
        } catch (err) {}
        syncSidebarProfile();

        
        const avatarEl = document.getElementById('accountAvatar');
        const dropdownUserPic = document.getElementById('accSummaryAvatar');
        const newPic = newProfile.picture;

        if (avatarEl) {
          if (newPic) {
            avatarEl.src = newPic;
            avatarEl.style.display = 'block';
            const iconEl = document.getElementById('accountIcon');
            if (iconEl) iconEl.style.display = 'none';
          } else {
            avatarEl.style.display = 'none';
          }
        }

        if (dropdownUserPic) {
          if (newPic) {
            dropdownUserPic.src = newPic;
            dropdownUserPic.style.display = 'block';
          } else {
            dropdownUserPic.style.display = 'none';
          }
        }

        const dn = getDisplayName();
        accName.textContent = dn;
        accEmail.textContent = newProfile.email || '';
        chipWelcome.textContent = `Welcome, ${dn}`;
        welcomeTitle.textContent = `Welcome, ${dn}`;
        profileModal.close();
      });
    }
    syncSidebarProfile();

    function closeProgramMenu() {
      if (profileProgramWrap) profileProgramWrap.classList.remove('open');
    }
    function closeYearMenu() {
      if (profileYearWrap) profileYearWrap.classList.remove('open');
    }
    profileYearButton?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!profileYearWrap) return;
      profileYearWrap.classList.toggle('open');
    });
    profileYearMenu?.addEventListener('click', (e) => {
      const option = e.target.closest('.profile-select-option');
      if (!option) return;
      const value = option.dataset.value || '';
      if (profileYearSelect) profileYearSelect.value = value;
      if (profileYearButton) profileYearButton.textContent = value;
      profileYearMenu.querySelectorAll('.profile-select-option').forEach(btn => {
        btn.classList.toggle('is-selected', btn === option);
      });
      closeYearMenu();
    });
    profileProgramButton?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!profileProgramWrap) return;
      profileProgramWrap.classList.toggle('open');
    });
    profileProgramMenu?.addEventListener('click', (e) => {
      const option = e.target.closest('.profile-select-option');
      if (!option) return;
      const value = option.dataset.value || '';
      if (profileProgramInput) profileProgramInput.value = value;
      if (profileProgramButton) profileProgramButton.textContent = value;
      profileProgramMenu.querySelectorAll('.profile-select-option').forEach(btn => {
        btn.classList.toggle('is-selected', btn === option);
      });
      closeProgramMenu();
    });
    document.addEventListener('click', (e) => {
      if (profileYearWrap && profileYearWrap.classList.contains('open') && !profileYearWrap.contains(e.target)) {
        closeYearMenu();
      }
      if (!profileProgramWrap || !profileProgramWrap.classList.contains('open')) return;
      if (!profileProgramWrap.contains(e.target)) closeProgramMenu();
    });

    
    profileCancelBtn?.addEventListener('click', function() {
      
document.querySelectorAll('.pw-eye').forEach(icon => {
  icon.addEventListener('click', () => {
    const targetId = icon.getAttribute('data-target');
    const inp = document.getElementById(targetId);
    if (!inp) return;
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    icon.setAttribute('name', isPw ? 'eye-off-outline' : 'eye-outline');
  });
});
      profileModal.close();
    });

    
    
    
    
    

    
    (function syncProfileAvatars() {
      const auth = getAuth();
      const avatarEl = document.getElementById('accountAvatar');
      const iconEl = document.getElementById('accountIcon');
      const dropdownUserPic = document.getElementById('accSummaryAvatar'); 

      if (!auth.loggedIn || !auth.username) {
        if (avatarEl) avatarEl.style.display = 'none';
        if (iconEl) iconEl.style.display = 'block';
        if (dropdownUserPic) {
          dropdownUserPic.src = '';
          dropdownUserPic.style.display = 'none';
        }
        return;
      }

      const userKey = `mysemester_user_${auth.username}`;
      let profile = null;
      try { profile = JSON.parse(localStorage.getItem(userKey)); } catch (e) {}

      const savedPfp = profile?.picture || localStorage.getItem(`uoft_user_${auth.username}_pfp`);
      if (savedPfp && avatarEl && iconEl) {
        avatarEl.src = savedPfp;
        avatarEl.style.display = 'block';
        iconEl.style.display = 'none';
      } else if (avatarEl && iconEl) {
        avatarEl.style.display = 'none';
        iconEl.style.display = 'block';
      }
      
      if (dropdownUserPic) {
        if (savedPfp) {
          dropdownUserPic.src = savedPfp;
          dropdownUserPic.style.display = 'block';
          dropdownUserPic.style.objectFit = 'cover';
          dropdownUserPic.style.borderRadius = '12px';
          dropdownUserPic.style.width = '48px';
          dropdownUserPic.style.height = '48px';
        } else {
          dropdownUserPic.src = ''; 
          dropdownUserPic.style.display = 'none';
        }
      }

      
      {
        const dn = getDisplayName();
        accName.textContent = dn;
        chipWelcome.textContent = "Welcome, " + dn;
        welcomeTitle.textContent = "Welcome, " + dn;
      }
      if (profile && profile.email) accEmail.textContent = profile.email;
    })();

    
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    themeToggle.addEventListener('click', ()=>{
      const current = localStorage.getItem(THEME_KEY) || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      applyTheme();
    });

    
    applyTheme();
    load();
    refreshAuthUI();
    render();
    initCloudSync();

    
    const displayName = getDisplayName();
    accName.textContent = displayName;
    chipWelcome.textContent = `Welcome, ${displayName}`;
    welcomeTitle.textContent = `Welcome, ${displayName}`;

    
    window.getUserCourseGradeKey = (courseCode) => {
      const user = localStorage.getItem('uoft_current_user') || 'guest';
      return `grades_${user}_${courseCode}`;
    };

    
    window.addEventListener("focus", () => {
      try {
        const mainStateRaw = localStorage.getItem(getUserSpecificKey(LS_KEY));
        if (mainStateRaw) {
          const mainState = JSON.parse(mainStateRaw);
          if (mainState && Array.isArray(mainState.courses)) {
            state.courses = mainState.courses; 
            render(); 
            console.log("Courses reloaded from localStorage after focus.");
          }
        }
      } catch (err) {
        console.error("❌ Failed to refresh course list:", err);
      }
    });
  

document.querySelectorAll('.pw-eye').forEach(icon=>{
  icon.addEventListener('click', ()=>{
    const target = document.getElementById(icon.dataset.target);
    const showing = target.getAttribute('type') === 'text';
    target.setAttribute('type', showing ? 'password' : 'text');
    icon.setAttribute('name', showing ? 'eye-outline' : 'eye-off-outline');
  });
});

document.getElementById('profileCancelBtn')?.addEventListener('click', ()=>{
  document.getElementById('profileModal').close();
});

const tourOverlay = document.getElementById('tourOverlay');
const tourCard = document.querySelector('.tour-card');
const tourTitle = document.getElementById('tourTitle');
const tourBody = document.getElementById('tourBody');
const tourStepLabel = document.getElementById('tourStepLabel');
const tourDots = document.getElementById('tourDots');
const tourPrev = document.getElementById('tourPrev');
const tourNext = document.getElementById('tourNext');
const tourSkip = document.getElementById('tourSkip');

const TOUR_KEY = 'uoft_tour_state_v2';
const TOUR_SEEN_KEY = 'uoft_tour_seen_v2';

const tourSteps = [
  {
    title: 'Add your first course',
    body: 'Tap Add Course to create a class with a code, title, and icon.',
    selector: '#openAddCourse'
  },
  {
    title: 'Customize your dashboard',
    body: 'Open Settings to switch themes, layout, and GPA format.',
    selector: '#openSettings'
  },
  {
    title: 'Update your profile',
    body: 'Use the profile icon to edit your name, email, and avatar.',
    selector: '#accountBtn'
  },
  {
    title: 'Open a course',
    body: 'Select a course card to enter assessments and grades.',
    selector: '.card'
  }
];

let tourIndex = 0;
let tourTarget = null;

function getTourState() {
  try {
    return JSON.parse(localStorage.getItem(TOUR_KEY) || 'null') || { step: 0 };
  } catch (err) {
    return { step: 0 };
  }
}

function setTourState(step) {
  localStorage.setItem(TOUR_KEY, JSON.stringify({ step }));
}

function clearTourHighlight() {
  if (tourTarget) {
    tourTarget.classList.remove('tour-highlight');
    tourTarget = null;
  }
}

function findTarget(selector) {
  if (selector === '.card') {
    return document.querySelector('.card') || document.querySelector('.empty-state-card');
  }
  return document.querySelector(selector);
}

function positionCallout(target) {
  if (!tourCard) return;
  if (!target) {
    tourCard.style.left = '50%';
    tourCard.style.top = '50%';
    tourCard.style.transform = 'translate(-50%, -50%)';
    tourCard.dataset.pos = 'top';
    return;
  }
  tourCard.style.transform = 'translate(0, 0)';
  const rect = target.getBoundingClientRect();
  const cardRect = tourCard.getBoundingClientRect();
  let top = rect.bottom + 12;
  let pos = 'bottom';
  if (top + cardRect.height > window.innerHeight - 12) {
    top = rect.top - cardRect.height - 12;
    pos = 'top';
  }
  let left = rect.left + rect.width / 2 - cardRect.width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));
  tourCard.style.top = `${Math.round(top)}px`;
  tourCard.style.left = `${Math.round(left)}px`;
  tourCard.dataset.pos = pos;
}

function renderTour() {
  if (!tourOverlay) return;
  const step = tourSteps[tourIndex];
  let target = findTarget(step.selector);
  let bodyText = step.body;
  if (tourIndex === 3 && !document.querySelector('.card')) {
    bodyText = 'Create a course first. Then open it to manage assessments.';
  }
  tourTitle.textContent = step.title;
  tourBody.textContent = bodyText;
  tourStepLabel.textContent = `${tourIndex + 1} of ${tourSteps.length}`;
  tourDots.innerHTML = '';
  tourSteps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = `tour-dot${i === tourIndex ? ' active' : ''}`;
    tourDots.appendChild(dot);
  });
  tourPrev.disabled = tourIndex === 0;
  if (tourIndex === 3) {
    tourNext.textContent = document.querySelector('.card') ? 'Open course' : 'Next';
    tourNext.disabled = !document.querySelector('.card');
  } else {
    tourNext.textContent = 'Next';
    tourNext.disabled = false;
  }
  clearTourHighlight();
  tourTarget = target;
  if (tourTarget) {
    tourTarget.classList.add('tour-highlight');
    tourTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  positionCallout(tourTarget);
}

function openTour() {
  if (!tourOverlay) return;
  tourOverlay.classList.add('show');
  tourOverlay.setAttribute('aria-hidden', 'false');
  renderTour();
}

function closeTour() {
  if (!tourOverlay) return;
  tourOverlay.classList.remove('show');
  tourOverlay.setAttribute('aria-hidden', 'true');
  clearTourHighlight();
  localStorage.setItem(TOUR_SEEN_KEY, 'true');
  localStorage.removeItem(TOUR_KEY);
}

tourNext?.addEventListener('click', () => {
  if (tourIndex === 3) {
    if (!document.querySelector('.card')) return;
    const nextCourse = state && Array.isArray(state.courses) ? state.courses[0] : null;
    if (nextCourse && nextCourse.code) {
      setTourState(4);
      window.location.href = `/grade/?course=${encodeURIComponent(nextCourse.code)}`;
      return;
    }
  }
  if (tourIndex < tourSteps.length - 1) {
    tourIndex += 1;
    setTourState(tourIndex);
    renderTour();
  }
});

tourPrev?.addEventListener('click', () => {
  if (tourIndex > 0) {
    tourIndex -= 1;
    setTourState(tourIndex);
    renderTour();
  }
});

tourSkip?.addEventListener('click', () => {
  closeTour();
});

window.addEventListener('resize', () => {
  if (tourOverlay && tourOverlay.classList.contains('show')) {
    positionCallout(tourTarget);
  }
});

window.addEventListener('scroll', () => {
  if (tourOverlay && tourOverlay.classList.contains('show')) {
    positionCallout(tourTarget);
  }
});

if (!localStorage.getItem(TOUR_SEEN_KEY)) {
  const auth = getAuth();
  if (auth && auth.loggedIn) {
    const saved = getTourState();
    tourIndex = Math.max(0, Math.min(3, saved.step || 0));
    setTimeout(() => {
      openTour();
    }, 700);
  }
}
