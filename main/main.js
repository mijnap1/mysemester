
    
    const SETTINGS_KEY = 'uoft_settings_v1';
    
    const defaultSettings = {
      theme: 'light', 
      layout: 'compact', 
      gpaFormat: '4.0', 
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
    
    const themeBtns = Array.from(document.querySelectorAll('.settings-theme-btn'));
    
    const layoutRadios = Array.from(document.querySelectorAll('.settings-layout-radio'));
    
    const gpaBtns = Array.from(document.querySelectorAll('.settings-gpa-btn'));
    
    const exportCoursesBtn = document.getElementById('exportCoursesBtn');
    const importCoursesBtn = document.getElementById('importCoursesBtn');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const importCoursesFileInput = document.getElementById('importCoursesFile');

    
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
      
      themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === s.theme);
      });
      
      layoutRadios.forEach(r => {
        r.checked = r.value === s.layout;
      });
      
      gpaBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gpa === s.gpaFormat);
      });
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
            grade: typeof course.grade === 'number' ? course.grade : parseFloat(course.grade) || 0,
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
            grade: typeof row.grade === 'number' ? row.grade : parseFloat(row.grade) || 0,
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
              grade: typeof localCourse.grade === 'number' ? localCourse.grade : cloudCourse.grade || 0,
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
      const counted = state.courses.filter(c => !c.crncr);
      if(!counted.length){ gpa4.textContent='0.00'; gpaLetter.textContent='—'; gpaPct.textContent='0%'; return; }
      const av = counted.reduce((s,c)=> s + (c.grade||0), 0) / counted.length;
      gpa4.textContent = gpaFromPct(av).toFixed(2);
      gpaLetter.textContent = letterFromPct(av);
      gpaPct.textContent = Math.round(av) + '%';
    }

    
    const grid = document.getElementById('courseGrid');
    const gpa4 = document.getElementById('gpa4');
    const gpaLetter = document.getElementById('gpaLetter');
    const gpaPct = document.getElementById('gpaPct');

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
              if (Array.isArray(assessments) && assessments.length > 0) {
                let totalWeighted = 0, totalWeight = 0;
                assessments.forEach(a => {
                  if (a.grade != null && !isNaN(a.grade)) {
                    totalWeighted += a.grade * (a.weight || 0);
                    totalWeight += (a.weight || 0);
                  }
                });
                if (totalWeight > 0) {
                  c.grade = totalWeighted / totalWeight;
                }
              }
            } catch(e) { console.error("Error parsing grades for", c.code, e); }
          }

          const card = document.createElement('div');
          card.className = 'card';
          card.dataset.id = c.id;

          const markId = 'm_'+c.id;
          card.innerHTML = `
            <ion-icon class="course-icon" name="${c.icon}"></ion-icon>
            <div class="info">
              <div class="code">${c.code}</div>
              <div class="muted-sm">
                ${c.title || ''}
                ${c.crncr ? '<span class="tag-crncr">CR/NCR</span>' : ''}
              </div>
            </div>
            <div class="mark"><span class="swap" id="${markId}">${Math.round(c.grade)}%</span></div>
          `;

          
          card.addEventListener('contextmenu', (e)=> openCtx(e, c.id));

          
          card.addEventListener('click', () => {
            const courseData = {
              code: c.code,
              title: c.title || '',
              icon: c.icon || 'book-outline',
              crncr: !!c.crncr   
            };
            localStorage.setItem('selectedCourse', JSON.stringify(courseData));
            window.location.href = `/grade/?course=${encodeURIComponent(c.code)}`;
          });

          grid.appendChild(card);
          startSwap(document.getElementById(markId), c.grade);
        }
      }
      recomputeOverview();
    }

    
    const swapTimers = new Map();
    function startSwap(el, pct){
      if(!el) return; if(swapTimers.has(el)) clearInterval(swapTimers.get(el));
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
    let ctxCourseId = null;
    function openCtx(e, id){
      e.preventDefault();
      ctxCourseId = id;

      
      const course = state.courses.find(c => c.id === id);
      if (course && course.crncr) {
        if (ctxCrncrLabelEl) ctxCrncrLabelEl.textContent = 'Remove CR/NCR';
      } else {
        if (ctxCrncrLabelEl) ctxCrncrLabelEl.textContent = 'Set CR/NCR';
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
      const grade = gradeRaw === '' ? 0 : Math.max(0, Math.min(100, parseFloat(gradeRaw)));

      if(editingId){
        const c = state.courses.find(x=>x.id===editingId);
        if(c){ c.code = normCode; c.title = title; c.icon = autoIcon(normCode, icon); c.grade = grade; }
      } else {
        state.courses.push({ id: uid(), code: normCode, title, icon: autoIcon(normCode, icon), grade, crncr: false });
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
    const accActionsSignedOut = document.getElementById('accActionsSignedOut');
    const accActionsSignedIn = document.getElementById('accActionsSignedIn');
    const signOutBtn = document.getElementById('signOut');
    const goProfile = document.getElementById('goProfile');
    
    goProfile?.addEventListener('click', () => {
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

    
    function saveProfile(profile) {
      const userKey = getProfileUserKey();
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(profile));
      }
    }

    
    function openProfileModal() {
      const profile = loadProfile();
      if (!profile) return;
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

