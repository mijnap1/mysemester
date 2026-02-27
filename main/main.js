
    
    const SETTINGS_KEY = 'uoft_settings_v1';
    function getUniversityRules() {
      let university = '';
      try {
        const setup = JSON.parse(localStorage.getItem('uoft_onboarding_v1') || 'null');
        university = setup?.university || '';
      } catch (err) {
        university = '';
      }
      const base = { university, showGpa: true, showLetter: true, showPercent: true, creditAllowed: false, creditLabel: '', gpaScale: 4.0 };
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
        return { ...base, showGpa: false, showLetter: false, creditAllowed: false, gpaScale: null };
      }
      if (university === 'University of Alberta') {
        return { ...base, creditAllowed: false };
      }
      if (university === 'McMaster University') {
        return { ...base, creditAllowed: false };
      }
      if (university === 'University of Ottawa') {
        return { ...base, creditAllowed: false, gpaScale: 10 };
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
    const appConfirmModal = document.getElementById('appConfirmModal');
    const appConfirmTitle = document.getElementById('appConfirmTitle');
    const appConfirmMessage = document.getElementById('appConfirmMessage');
    const appConfirmCancel = document.getElementById('appConfirmCancel');
    const appConfirmOk = document.getElementById('appConfirmOk');
    const appInputModal = document.getElementById('appInputModal');
    const appInputForm = document.getElementById('appInputForm');
    const appInputTitle = document.getElementById('appInputTitle');
    const appInputMessage = document.getElementById('appInputMessage');
    const appInputField = document.getElementById('appInputField');
    const appInputError = document.getElementById('appInputError');
    const appInputCancel = document.getElementById('appInputCancel');
    const appInputOk = document.getElementById('appInputOk');
    const appToast = document.getElementById('appToast');
    const calcFab = document.getElementById('calcFab');
    const miniCalc = document.getElementById('miniCalc');
    const miniCalcClose = document.getElementById('miniCalcClose');
    const miniCalcDisplay = document.getElementById('miniCalcDisplay');
    const miniCalcGrid = miniCalc ? miniCalc.querySelector('.mini-calc-grid') : null;

    let calcExpression = '0';
    let calcResultShown = false;

    function formatCalcNumber(value) {
      if (!Number.isFinite(value)) return 'Error';
      const rounded = Math.round(value * 1e10) / 1e10;
      return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    }

    function updateCalcDisplay() {
      if (!miniCalcDisplay) return;
      miniCalcDisplay.textContent = calcExpression || '0';
    }

    function isCalcOperator(ch) {
      return ch === '+' || ch === '-' || ch === '×' || ch === '÷';
    }

    function appendCalcValue(rawValue) {
      const value = String(rawValue);
      const last = calcExpression.slice(-1);
      const isDigit = /^[0-9]$/.test(value);

      if (calcExpression === 'Error') {
        calcExpression = isDigit ? value : '0';
      }
      if (calcResultShown && (isDigit || value === '.')) {
        calcExpression = '0';
      }
      calcResultShown = false;

      if (isDigit) {
        calcExpression = calcExpression === '0' ? value : calcExpression + value;
        updateCalcDisplay();
        return;
      }

      if (value === '.') {
        const currentNumber = calcExpression.split(/[+\-×÷]/).pop() || '';
        if (!currentNumber.includes('.')) {
          calcExpression += '.';
        }
        updateCalcDisplay();
        return;
      }

      if (value === '%') {
        const match = calcExpression.match(/(\d*\.?\d+)(?!.*\d)/);
        if (match) {
          const percentValue = Number(match[1]) / 100;
          calcExpression = calcExpression.replace(/(\d*\.?\d+)(?!.*\d)/, formatCalcNumber(percentValue));
        }
        updateCalcDisplay();
        return;
      }

      if (!isCalcOperator(value)) return;
      if (isCalcOperator(last)) {
        calcExpression = calcExpression.slice(0, -1) + value;
      } else {
        calcExpression += value;
      }
      updateCalcDisplay();
    }

    function evaluateCalcExpression() {
      if (!calcExpression || calcExpression === 'Error') return;
      let normalized = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
      normalized = normalized.replace(/(\d*\.?\d+)%/g, '($1/100)');
      if (!/^[0-9+\-*/.() ]+$/.test(normalized)) {
        calcExpression = 'Error';
        calcResultShown = true;
        updateCalcDisplay();
        return;
      }
      try {
        const result = Function(`"use strict"; return (${normalized})`)();
        calcExpression = formatCalcNumber(Number(result));
        calcResultShown = true;
      } catch (_) {
        calcExpression = 'Error';
        calcResultShown = true;
      }
      updateCalcDisplay();
    }

    function clearCalc() {
      calcExpression = '0';
      calcResultShown = false;
      updateCalcDisplay();
    }

    function backspaceCalc() {
      if (calcExpression === 'Error') {
        clearCalc();
        return;
      }
      if (calcExpression.length <= 1) {
        calcExpression = '0';
      } else {
        calcExpression = calcExpression.slice(0, -1);
      }
      updateCalcDisplay();
    }

    function toggleCalcSign() {
      const match = calcExpression.match(/(-?\d*\.?\d+)(?!.*\d)/);
      if (!match) return;
      const current = match[1];
      const toggled = current.startsWith('-') ? current.slice(1) : `-${current}`;
      calcExpression = calcExpression.replace(/(-?\d*\.?\d+)(?!.*\d)/, toggled);
      updateCalcDisplay();
    }

    function openMiniCalc() {
      if (!miniCalc || !calcFab) return;
      miniCalc.classList.add('show');
      miniCalc.setAttribute('aria-hidden', 'false');
      calcFab.setAttribute('aria-expanded', 'true');
      updateCalcDisplay();
    }

    function closeMiniCalc() {
      if (!miniCalc || !calcFab) return;
      miniCalc.classList.remove('show');
      miniCalc.setAttribute('aria-hidden', 'true');
      calcFab.setAttribute('aria-expanded', 'false');
    }

    calcFab?.addEventListener('click', () => {
      if (!miniCalc) return;
      if (miniCalc.classList.contains('show')) {
        closeMiniCalc();
      } else {
        openMiniCalc();
      }
    });

    miniCalcClose?.addEventListener('click', closeMiniCalc);

    miniCalcGrid?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.calcAction;
      if (action === 'clear') {
        clearCalc();
        return;
      }
      if (action === 'backspace') {
        backspaceCalc();
        return;
      }
      if (action === 'sign') {
        toggleCalcSign();
        return;
      }
      if (action === 'equals') {
        evaluateCalcExpression();
        return;
      }
      const value = btn.dataset.calcValue;
      if (value) appendCalcValue(value);
    });

    document.addEventListener('click', (e) => {
      if (!miniCalc || !calcFab || !miniCalc.classList.contains('show')) return;
      const target = e.target;
      if (miniCalc.contains(target) || calcFab.contains(target)) return;
      closeMiniCalc();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && miniCalc?.classList.contains('show')) {
        closeMiniCalc();
      }
    });

    function showToast(message, type = 'info', duration = 2600) {
      if (!appToast) return;
      appToast.textContent = message;
      appToast.classList.remove('show', 'is-success', 'is-error');
      if (type === 'success') appToast.classList.add('is-success');
      if (type === 'error') appToast.classList.add('is-error');
      requestAnimationFrame(() => appToast.classList.add('show'));
      setTimeout(() => {
        appToast.classList.remove('show');
      }, duration);
    }

    function askConfirm({
      title = 'Confirm action',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmTone = 'primary',
      showCancel = true
    } = {}) {
      if (!appConfirmModal || !appConfirmOk) {
        return Promise.resolve(window.confirm(message));
      }
      return new Promise((resolve) => {
        appConfirmTitle.textContent = title;
        appConfirmMessage.textContent = message;
        appConfirmOk.textContent = confirmText;
        appConfirmOk.classList.toggle('danger', confirmTone === 'danger');
        if (appConfirmCancel) {
          appConfirmCancel.textContent = cancelText;
          appConfirmCancel.style.display = showCancel ? '' : 'none';
        }

        const cleanup = () => {
          appConfirmModal.removeEventListener('close', onClose);
          appConfirmCancel?.removeEventListener('click', onCancel);
          appConfirmOk.removeEventListener('click', onOk);
        };
        const onCancel = () => appConfirmModal.close('cancel');
        const onOk = () => appConfirmModal.close('confirm');
        const onClose = () => {
          const confirmed = appConfirmModal.returnValue === 'confirm';
          cleanup();
          updateDialogLock();
          resolve(confirmed);
        };

        appConfirmCancel?.addEventListener('click', onCancel);
        appConfirmOk.addEventListener('click', onOk);
        appConfirmModal.addEventListener('close', onClose);
        appConfirmModal.showModal();
        updateDialogLock();
        setTimeout(() => appConfirmOk.focus(), 0);
      });
    }

    function showNotice(message, title = 'Notice') {
      return askConfirm({
        title,
        message,
        confirmText: 'OK',
        showCancel: false
      });
    }

    function askInput({
      title = 'Enter value',
      message = 'Provide a value below.',
      initialValue = '',
      placeholder = '',
      confirmText = 'Save',
      validate = null
    } = {}) {
      if (!appInputModal || !appInputField || !appInputForm) {
        const raw = window.prompt(message, initialValue);
        return Promise.resolve(raw == null ? null : raw.trim());
      }
      return new Promise((resolve) => {
        appInputTitle.textContent = title;
        appInputMessage.textContent = message;
        appInputField.value = initialValue;
        appInputField.placeholder = placeholder;
        appInputOk.textContent = confirmText;
        appInputError.style.display = 'none';
        appInputError.textContent = '';

        const cleanup = () => {
          appInputForm.removeEventListener('submit', onSubmit);
          appInputCancel?.removeEventListener('click', onCancel);
          appInputModal.removeEventListener('close', onClose);
        };
        const onCancel = () => appInputModal.close('cancel');
        const onSubmit = (e) => {
          e.preventDefault();
          const nextValue = appInputField.value.trim();
          const errorMessage = typeof validate === 'function' ? validate(nextValue) : '';
          if (errorMessage) {
            appInputError.textContent = errorMessage;
            appInputError.style.display = 'block';
            appInputField.focus();
            return;
          }
          appInputModal.close('confirm');
        };
        const onClose = () => {
          const wasConfirmed = appInputModal.returnValue === 'confirm';
          const value = wasConfirmed ? appInputField.value.trim() : null;
          cleanup();
          updateDialogLock();
          resolve(value);
        };

        appInputForm.addEventListener('submit', onSubmit);
        appInputCancel?.addEventListener('click', onCancel);
        appInputModal.addEventListener('close', onClose);
        appInputModal.showModal();
        updateDialogLock();
        setTimeout(() => {
          appInputField.focus();
          appInputField.select();
        }, 0);
      });
    }

    
    if (gpaSettingsCard && !universityRules.showGpa) {
      gpaSettingsCard.style.display = 'none';
    }

    function updateDialogLock() {
      const anyOpen = !!document.querySelector('dialog[open]');
      document.body.classList.toggle('dialog-lock', anyOpen);
    }

    openSettingsBtn?.addEventListener('click', ()=>{
      settingsModal.showModal();
      settingsModal.scrollTop = 0;
      settingsModal.querySelector('.modal-body')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      syncSettingsModalUI();
      updateDialogLock();
    });
    closeSettingsBtn?.addEventListener('click', ()=>{
      settingsModal.close();
      updateDialogLock();
    });
    settingsModal.addEventListener('close', updateDialogLock);
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
          void showNotice('No courses to export.');
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
        void showNotice('Sorry, something went wrong while exporting your courses.', 'Export failed');
      }
    });

    
    importCoursesBtn?.addEventListener('click', () => {
      if (!importCoursesFileInput) {
        void showNotice('Import is not available in this environment.', 'Import unavailable');
        return;
      }
      importCoursesFileInput.click();
    });

    
    importCoursesFileInput?.addEventListener('change', (e) => {
      const file = importCoursesFileInput.files && importCoursesFileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const text = evt.target?.result;
          const parsed = JSON.parse(text);
          
          const rawCourses = Array.isArray(parsed?.courses)
            ? parsed.courses
            : (Array.isArray(parsed) ? parsed : null);

          if (!rawCourses) {
            await showNotice('This file does not look like a valid MySemester export.', 'Import failed');
            return;
          }
          if (!rawCourses.length) {
            await showNotice('No courses were found in this file.', 'Import failed');
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

          const shouldImport = await askConfirm({
            title: 'Import courses',
            message: `Import ${imported.length} courses? This will replace your current list.`,
            confirmText: 'Import',
            confirmTone: 'danger'
          });
          if (!shouldImport) {
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

          showToast('Courses imported successfully.', 'success');
        } catch (err) {
          console.error('Import error:', err);
          await showNotice('Could not read this file. Please make sure it is a valid MySemester export.', 'Import failed');
        } finally {
          
          importCoursesFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });

    
    resetDataBtn?.addEventListener('click', async () => {
      const shouldReset = await askConfirm({
        title: 'Reset all data?',
        message: 'Are you sure you want to reset ALL data for this account? This cannot be undone.',
        confirmText: 'Reset all data',
        confirmTone: 'danger'
      });
      if (!shouldReset) {
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

        
        state = { courses: [], folders: [], currentFolderId: null };
        save();
        render();
        showToast('All data for this account has been reset.', 'success');
      } catch (err) {
        console.error('Reset error:', err);
        await showNotice('Something went wrong while resetting data.', 'Reset failed');
      }
    });
    

    
    const openAboutBtn = document.getElementById('openAbout');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('closeAbout');
    openAboutBtn?.addEventListener('click', () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      aboutModal.showModal();
      aboutModal.scrollTop = 0;
      aboutModal.querySelector('.about-modal-body')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      updateDialogLock();
    });
    closeAboutBtn?.addEventListener('click', ()=>{
      aboutModal.close();
      updateDialogLock();
    });
    aboutModal.addEventListener('close', updateDialogLock);
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') aboutModal.close?.();
    });

    
    const quickTipEl = document.querySelector('.sidebar-help-text');
    if (quickTipEl) {
      const tips = [
        'Right-click a course card for edit, duplicate, and more options.',
        'Double-click an assessment name or weight to edit it.',
        'Use the target estimate to see what you need on remaining work.',
        'Switch between compact and spacious layouts in Settings.'
      ];
      let tipIndex = 0;
      setInterval(() => {
        tipIndex = (tipIndex + 1) % tips.length;
        quickTipEl.textContent = tips[tipIndex];
      }, 6000);
    }
    

    
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

    
    let state = { courses: [], folders: [], currentFolderId: null };
    const DRAG_TYPE = 'application/x-mysemester-item';

    const uid = () => Math.random().toString(36).slice(2,9);
    let highlightedCardId = null;
    let highlightedFolderId = null;

    function applyCardEntrance(card, index) {
      if (!card) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      card.style.setProperty('--card-enter-delay', `${Math.min(index * 36, 220)}ms`);
      card.classList.add('card-enter');
      card.addEventListener('animationend', () => {
        card.classList.remove('card-enter');
      }, { once: true });
    }

    
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
        
        state = { courses: [], folders: [], currentFolderId: null };
        save();
      }
      if (!Array.isArray(state.courses)) state.courses = [];
      if (!Array.isArray(state.folders)) state.folders = [];
      if (state.currentFolderId === undefined) state.currentFolderId = null;
      const folderIds = new Set(state.folders.map((folder) => folder.id));
      state.folders.forEach((folder) => {
        folder.parentFolderId = folder.parentFolderId || null;
        if (folder.parentFolderId && !folderIds.has(folder.parentFolderId)) {
          folder.parentFolderId = null;
        }
      });
      if (state.currentFolderId && !folderIds.has(state.currentFolderId)) {
        state.currentFolderId = null;
      }
    }

    function getFolderById(id) {
      return state.folders.find((folder) => folder.id === id) || null;
    }

    function isFolderInSubtree(folderId, rootId) {
      let cursor = getFolderById(folderId);
      while (cursor) {
        if (cursor.id === rootId) return true;
        cursor = cursor.parentFolderId ? getFolderById(cursor.parentFolderId) : null;
      }
      return false;
    }

    function getDragPayload(e) {
      const raw = e.dataTransfer?.getData(DRAG_TYPE);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.kind !== 'course' && parsed.kind !== 'folder') return null;
        if (!parsed.id) return null;
        return parsed;
      } catch (_) {
        return null;
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
            crncr: !!course.crncr,
            folderId: course.folderId || null
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
            crncr: !!row.crncr,
            folderId: null
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
              crncr: typeof localCourse.crncr === 'boolean' ? localCourse.crncr : !!cloudCourse.crncr,
              folderId: localCourse.folderId || null
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

    
    const GPA_MAPS = {
      'University of Toronto': {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
      },
      'University of British Columbia': {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D': 1.0,
        'F': 0.0
      },
      'McGill University': {
        'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0,
        'D': 1.0,
        'F': 0.0
      },
      'McMaster University': {
        'A+': 4.0, 'A': 3.9, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0,
        'F': 0.0
      },
      'University of Ottawa': {
        'A+': 10, 'A': 9, 'A-': 8,
        'B+': 7, 'B': 6,
        'C+': 5, 'C': 4,
        'D+': 3, 'D': 2,
        'E': 1,
        'F': 0
      },
      'University of Alberta': {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0,
        'F': 0.0
      }
    };

    function letterFromPct(p){
      if(p>=90) return 'A+'; if(p>=85) return 'A'; if(p>=80) return 'A-';
      if(p>=77) return 'B+'; if(p>=73) return 'B'; if(p>=70) return 'B-';
      if(p>=67) return 'C+'; if(p>=63) return 'C'; if(p>=60) return 'C-';
      if(p>=57) return 'D+'; if(p>=53) return 'D'; if(p>=50) return 'D-';
      return 'F';
    }
    function normalizeLetterForSchool(letter, school) {
      if (!school) return letter;
      if (school === 'McGill University') {
        if (letter === 'A+') return 'A';
        if (letter === 'D+' || letter === 'D-') return 'D';
        if (letter === 'C-') return 'C';
      }
      if (school === 'University of British Columbia') {
        if (letter === 'D+' || letter === 'D-') return 'D';
      }
      if (school === 'McMaster University') {
        if (letter === 'D-') return 'D';
      }
      if (school === 'University of Ottawa') {
        if (letter === 'B-') return 'B';
        if (letter === 'C-') return 'C';
        if (letter === 'D-') return 'D';
      }
      return letter;
    }
    function gpaFromPct(p){
      const school = universityRules.university || '';
      const letter = normalizeLetterForSchool(letterFromPct(p), school);
      const map = GPA_MAPS[school];
      if (!map) return 0.0;
      if (Object.prototype.hasOwnProperty.call(map, letter)) return map[letter];
      if (letter.endsWith('+') || letter.endsWith('-')) {
        const base = letter.slice(0, -1);
        if (Object.prototype.hasOwnProperty.call(map, base)) return map[base];
      }
      return map.F ?? 0.0;
    }

    function recomputeOverview(){
      const inFolderView = !!state.currentFolderId;
      const scopedCourses = inFolderView
        ? state.courses.filter(c => c.folderId === state.currentFolderId)
        : state.courses;
      const counted = scopedCourses.filter(c => !(universityRules.creditAllowed && c.crncr));
      const graded = counted.filter(c => typeof c.grade === 'number' && !isNaN(c.grade));
      if(!graded.length){
        gpa4.textContent='—';
        gpaLetter.textContent='—';
        gpaPct.textContent='—';
        return;
      }
      const av = graded.reduce((s,c)=> s + c.grade, 0) / graded.length;
      gpa4.textContent = gpaFromPct(av).toFixed(2);
      gpaLetter.textContent = normalizeLetterForSchool(letterFromPct(av), universityRules.university || '');
      gpaPct.textContent = Math.round(av) + '%';
    }

    
    const grid = document.getElementById('courseGrid');
    const gpa4 = document.getElementById('gpa4');
    const gpaLetter = document.getElementById('gpaLetter');
    const gpaPct = document.getElementById('gpaPct');
    const gpa4Wrap = gpa4 ? gpa4.closest('.ov') : null;
    const gpaLetterWrap = gpaLetter ? gpaLetter.closest('.ov') : null;
    const gpa4Label = gpa4Wrap ? gpa4Wrap.querySelector('.label') : null;
    if (gpa4Label && universityRules.gpaScale) {
      gpa4Label.textContent = `GPA (${universityRules.gpaScale})`;
    }
    if (gpa4Wrap) gpa4Wrap.style.display = universityRules.showGpa ? '' : 'none';
    if (gpaLetterWrap) gpaLetterWrap.style.display = universityRules.showLetter ? '' : 'none';

    function render(){
      if (state.currentFolderId && !getFolderById(state.currentFolderId)) {
        state.currentFolderId = null;
      }
      grid.innerHTML = '';
      grid.classList.remove('grid-empty');
      document.body.classList.remove('no-scroll-empty');

      const inFolderView = !!state.currentFolderId;
      const folderBackBtn = document.getElementById('folderBackBtn');
      if (folderBackBtn) {
        folderBackBtn.style.display = inFolderView ? 'inline-flex' : 'none';
        const currentFolder = inFolderView ? getFolderById(state.currentFolderId) : null;
        folderBackBtn.innerHTML = currentFolder && currentFolder.parentFolderId
          ? '<ion-icon name="arrow-back-outline"></ion-icon> Back to parent folder'
          : '<ion-icon name="arrow-back-outline"></ion-icon> Back to all courses';
        folderBackBtn.onclick = () => {
          state.currentFolderId = currentFolder && currentFolder.parentFolderId
            ? currentFolder.parentFolderId
            : null;
          save();
          render();
        };
      }

      const auth = getAuth();
      const username = auth && auth.username ? auth.username : "guest";

      function syncGradeFromLocal(c) {
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
                c.grade = totalWeight > 0 ? (totalWeighted / totalWeight) : null;
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
      }

      function buildCourseCard(c) {
        syncGradeFromLocal(c);
        const card = document.createElement('div');
        card.className = 'card';
        if (highlightedCardId && c.id === highlightedCardId) {
          card.classList.add('card-pop');
        }
        card.dataset.id = c.id;
        card.draggable = true;

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
        addLongPressCtx(card, c.id);
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
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', c.id);
          e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'course', id: c.id }));
          e.dataTransfer.effectAllowed = 'move';
        });
        if (hasGrade) {
          requestAnimationFrame(() => startSwap(document.getElementById(markId), c.grade));
        }
        return card;
      }

      function buildFolderCard(folder) {
        const card = document.createElement('div');
        card.className = 'card folder-card';
        if (highlightedFolderId && folder.id === highlightedFolderId) {
          card.classList.add('card-pop');
        }
        card.dataset.folderId = folder.id;
        const count = state.courses.filter(c => c.folderId === folder.id).length;
        let dragArmedUntil = 0;
        let armTimer = null;
        let pressX = 0;
        let pressY = 0;
        let lastLongPress = 0;
        const armDelay = 520;
        const moveThreshold = 10;
        card.innerHTML = `
          <ion-icon class="course-icon" name="folder-outline"></ion-icon>
          <div class="info">
            <div class="code">${folder.name}</div>
            <div class="muted-sm">${count} course${count === 1 ? '' : 's'}</div>
            <div class="folder-hint">Click to open · Drag courses/folders here</div>
          </div>
          <span class="folder-badge">${count}</span>
        `;
        const armFolderDrag = () => {
          dragArmedUntil = Date.now() + 1200;
          lastLongPress = Date.now();
          card.classList.add('folder-drag-armed');
          card.draggable = true;
          setTimeout(() => {
            if (Date.now() >= dragArmedUntil) {
              card.classList.remove('folder-drag-armed');
              card.draggable = false;
            }
          }, 1300);
        };
        const clearArmTimer = () => {
          if (armTimer) {
            clearTimeout(armTimer);
            armTimer = null;
          }
        };
        card.draggable = false;
        card.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          pressX = e.clientX;
          pressY = e.clientY;
          clearArmTimer();
          armTimer = setTimeout(() => {
            armTimer = null;
            armFolderDrag();
          }, armDelay);
        });
        card.addEventListener('pointermove', (e) => {
          if (!armTimer) return;
          const dx = Math.abs(e.clientX - pressX);
          const dy = Math.abs(e.clientY - pressY);
          if (dx > moveThreshold || dy > moveThreshold) {
            clearArmTimer();
          }
        });
        card.addEventListener('pointerup', clearArmTimer);
        card.addEventListener('pointercancel', clearArmTimer);
        card.addEventListener('pointerleave', clearArmTimer);
        card.addEventListener('click', () => {
          if (Date.now() - lastLongPress < 700) return;
          state.currentFolderId = folder.id;
          save();
          render();
        });
        card.addEventListener('dblclick', async () => {
          const next = await askInput({
            title: 'Rename folder',
            message: 'Choose a new folder name.',
            initialValue: folder.name,
            placeholder: 'e.g. Midterms',
            confirmText: 'Rename',
            validate: (value) => {
              if (!value) return 'Folder name is required.';
              const exists = state.folders.some((f) => (
                f.id !== folder.id && (f.name || '').toLowerCase() === value.toLowerCase()
              ));
              if (exists) return 'A folder with that name already exists.';
              return '';
            }
          });
          if (!next) return;
          folder.name = next;
          save();
          render();
        });
        card.addEventListener('contextmenu', (e) => openFolderCtx(e, folder.id));
        card.addEventListener('dragstart', (e) => {
          if (Date.now() > dragArmedUntil) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('text/plain', folder.id);
          e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'folder', id: folder.id }));
          e.dataTransfer.effectAllowed = 'move';
          card.classList.remove('folder-drag-armed');
          card.draggable = false;
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('folder-drag-armed');
          card.draggable = false;
        });
        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('drag-over');
          const payload = getDragPayload(e);
          if (!payload) return;
          if (payload.kind === 'course') {
            const course = state.courses.find(c => c.id === payload.id);
            if (!course) return;
            course.folderId = folder.id;
          } else {
            const draggedFolder = getFolderById(payload.id);
            if (!draggedFolder) return;
            if (draggedFolder.id === folder.id) return;
            if (isFolderInSubtree(folder.id, draggedFolder.id)) return;
            draggedFolder.parentFolderId = folder.id;
          }
          save();
          render();
        });
        return card;
      }

      if (!state.courses.length && !state.folders.length) {
        grid.classList.add('grid-empty');
        document.body.classList.add('no-scroll-empty');
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
        recomputeOverview();
        return;
      }

      let entranceIndex = 0;
      const sortedFolders = state.folders
        .filter((folder) => (folder.parentFolderId || null) === (state.currentFolderId || null))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      sortedFolders.forEach((folder) => {
        const folderCard = buildFolderCard(folder);
        grid.appendChild(folderCard);
        applyCardEntrance(folderCard, entranceIndex);
        entranceIndex += 1;
      });

      const visibleCourses = inFolderView
        ? state.courses.filter(c => c.folderId === state.currentFolderId)
        : state.courses.filter(c => !c.folderId);

      visibleCourses.forEach((c) => {
        const courseCard = buildCourseCard(c);
        grid.appendChild(courseCard);
        applyCardEntrance(courseCard, entranceIndex);
        entranceIndex += 1;
      });
      if (inFolderView && visibleCourses.length === 0 && sortedFolders.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state-card';
        empty.innerHTML = `
          <div class="empty-plus-badge">
            <ion-icon name="folder-open-outline"></ion-icon>
          </div>
          <div class="empty-title">This folder is empty</div>
          <div class="empty-desc">Drag a course into the folder to get started.</div>
        `;
        grid.appendChild(empty);
      }

      if (!inFolderView) {
        const addCard = document.createElement('button');
        addCard.type = 'button';
        addCard.className = 'card add-course-card';
        addCard.innerHTML = `
          <ion-icon class="course-icon" name="add-outline"></ion-icon>
          <div class="info">
            <div class="code">Add Course</div>
            <div class="muted-sm">Create another class</div>
          </div>
        `;
        addCard.addEventListener('click', () => {
          editingId = null;
          modalTitle.textContent = 'Add Course';
          addCourseForm.reset();
          iconPreview.setAttribute('name', 'book-outline');
          addCourseModal.showModal();
        });
        grid.appendChild(addCard);
        applyCardEntrance(addCard, entranceIndex);
      }

      grid.ondragover = (e) => {
        if (!inFolderView) return;
        e.preventDefault();
      };
      grid.ondrop = (e) => {
        if (!inFolderView) return;
        const payload = getDragPayload(e);
        if (!payload) return;
        if (payload.kind === 'course') {
          const course = state.courses.find(c => c.id === payload.id);
          if (!course) return;
          course.folderId = null;
        } else {
          const folder = getFolderById(payload.id);
          if (!folder) return;
          folder.parentFolderId = state.currentFolderId;
        }
        save();
        render();
      };

      recomputeOverview();
      highlightedCardId = null;
      highlightedFolderId = null;
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
    const folderCtx = document.getElementById('folderCtxMenu');
    const ctxCrncrLabelEl = document.getElementById('ctxCrncrLabel');
    const ctxCrncrBtn = ctx ? ctx.querySelector('button[data-act="crncr"]') : null;
    let ctxCourseId = null;
    let ctxFolderId = null;
    function addLongPressCtx(card, id){
      let timer = null;
      let startX = 0;
      let startY = 0;
      let lastLongPress = 0;
      const threshold = 10;
      const delay = 520;

      function clearTimer(){
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }

      card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        clearTimer();
        timer = setTimeout(() => {
          lastLongPress = Date.now();
          openCtx({ preventDefault(){}, clientX: startX, clientY: startY }, id);
        }, delay);
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (!timer || !e.touches.length) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if (dx > threshold || dy > threshold) {
          clearTimer();
        }
      }, { passive: true });

      card.addEventListener('touchend', clearTimer);
      card.addEventListener('touchcancel', clearTimer);

      card.addEventListener('click', (e) => {
        if (Date.now() - lastLongPress < 700) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
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
    function positionFolderCtx(x,y){
      if (!folderCtx) return;
      const pad = 8; const w = folderCtx.offsetWidth || 200; const h = folderCtx.offsetHeight || 120;
      const vw = window.innerWidth, vh = window.innerHeight; let left = x, top = y;
      if(left + w + pad > vw) left = vw - w - pad; if(top + h + pad > vh) top = vh - h - pad;
      folderCtx.style.left = left + 'px'; folderCtx.style.top = top + 'px';
    }
    function openFolderCtx(e, id){
      if (!folderCtx) return;
      e.preventDefault();
      ctxFolderId = id;
      positionFolderCtx(e.clientX, e.clientY);
      folderCtx.classList.add('show');
      document.addEventListener('click', () => folderCtx.classList.remove('show'), { once: true });
    }

    ctx.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return; const act = btn.dataset.act; ctx.classList.remove('show');
      if(act==='del') void removeCourse(ctxCourseId);
      if(act==='dup') duplicateCourse(ctxCourseId);
      if(act==='edit') editCourse(ctxCourseId);
      if(act==='crncr') toggleCrncr(ctxCourseId);
    });
    folderCtx?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button'); if(!btn) return;
      const act = btn.dataset.act;
      folderCtx.classList.remove('show');
      const folder = state.folders.find(f => f.id === ctxFolderId);
      if (!folder) return;
      if (act === 'rename') {
        const next = await askInput({
          title: 'Rename folder',
          message: 'Choose a new folder name.',
          initialValue: folder.name,
          placeholder: 'e.g. Midterms',
          confirmText: 'Rename',
          validate: (value) => {
            if (!value) return 'Folder name is required.';
            const exists = state.folders.some((f) => (
              f.id !== folder.id && (f.name || '').toLowerCase() === value.toLowerCase()
            ));
            if (exists) return 'A folder with that name already exists.';
            return '';
          }
        });
        if (!next) return;
        folder.name = next;
        save();
        render();
      }
      if (act === 'del') {
        const shouldDelete = await askConfirm({
          title: 'Delete folder?',
          message: `Delete folder "${folder.name}"? Courses will become unassigned.`,
          confirmText: 'Delete folder',
          confirmTone: 'danger'
        });
        if (!shouldDelete) return;
        const deletedParentId = folder.parentFolderId || null;
        state.folders = state.folders.filter(f => f.id !== ctxFolderId);
        state.folders.forEach((f) => {
          if (f.parentFolderId === ctxFolderId) {
            f.parentFolderId = deletedParentId;
          }
        });
        state.courses.forEach(c => { if (c.folderId === ctxFolderId) c.folderId = null; });
        if (state.currentFolderId === ctxFolderId) state.currentFolderId = deletedParentId;
        save();
        render();
      }
    });

    let undoTimer = null;
    let pendingUndo = null;

    function hideUndoToast() {
      if (!undoToast) return;
      undoToast.classList.remove('show');
    }

    function showUndoToast(course, index) {
      if (!undoToast || !undoBtn || !undoText) return;
      if (undoTimer) clearTimeout(undoTimer);
      pendingUndo = { course, index };
      undoText.textContent = `${course.code || 'Course'} removed.`;
      undoToast.classList.add('show');
      undoBtn.onclick = () => {
        if (!pendingUndo) return;
        const insertAt = Math.min(Math.max(pendingUndo.index, 0), state.courses.length);
        state.courses.splice(insertAt, 0, pendingUndo.course);
        highlightedCardId = pendingUndo.course?.id || null;
        save();
        render();
        pendingUndo = null;
        if (undoTimer) clearTimeout(undoTimer);
        hideUndoToast();
      };
      undoTimer = setTimeout(() => {
        pendingUndo = null;
        hideUndoToast();
      }, 4500);
    }

    async function removeCourse(id){
      const card = [...document.querySelectorAll('.card')].find(c=>c.dataset.id===id);
      const shouldRemove = await askConfirm({
        title: 'Remove course?',
        message: 'Remove this course?',
        confirmText: 'Remove',
        confirmTone: 'danger'
      });
      if(!shouldRemove) return;
      const idx = state.courses.findIndex(c => c.id === id);
      const removedCourse = idx !== -1 ? state.courses[idx] : null;
      if(card){ card.classList.add('fade-out'); setTimeout(()=>{
        state.courses = state.courses.filter(c=>c.id!==id); save(); render();
        if (removedCourse) showUndoToast(removedCourse, idx);
      }, 260); }
      else {
        state.courses = state.courses.filter(c=>c.id!==id); save(); render();
        if (removedCourse) showUndoToast(removedCourse, idx);
      }
    }
    function duplicateCourse(id){
      const c = state.courses.find(x=>x.id===id); if(!c) return;
      const copy = { ...c, id: uid(), code: c.code+" (copy)" };
      highlightedCardId = copy.id;
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
    const openAddFolder = document.getElementById('openAddFolder');
    const openBulkImport = document.getElementById('openBulkImport');
    const bulkImportModal = document.getElementById('bulkImportModal');
    const bulkImportInput = document.getElementById('bulkImportInput');
    const bulkImportError = document.getElementById('bulkImportError');
    const bulkImportCancel = document.getElementById('bulkImportCancel');
    const bulkImportSave = document.getElementById('bulkImportSave');

    const addCourseModal = document.getElementById('addCourseModal');
    const addCourseForm = document.getElementById('addCourseForm');
    const cancelCourse = document.getElementById('cancelCourse');
    const saveCourse = document.getElementById('saveCourse');
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
      folderCtx?.classList.remove('show');
      accountDd.classList.remove('show');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        addCourseModal.close?.();
        ctx.classList.remove('show');
        folderCtx?.classList.remove('show');
        accountDd.classList.remove('show');
      }
    });

    openAddCourse.addEventListener('click', ()=>{
      editingId = null; modalTitle.textContent = 'Add Course';
      addCourseForm.reset(); iconPreview.setAttribute('name','book-outline');
      addCourseModal.showModal();
    });
    openAddFolder?.addEventListener('click', async () => {
      const trimmed = await askInput({
        title: 'New folder',
        message: 'Choose a folder name.',
        placeholder: 'e.g. Winter 2026',
        confirmText: 'Create folder',
        validate: (value) => {
          if (!value) return 'Folder name is required.';
          const exists = state.folders.some((f) => (f.name || '').toLowerCase() === value.toLowerCase());
          if (exists) return 'A folder with that name already exists.';
          return '';
        }
      });
      if (!trimmed) return;
      const exists = state.folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        await showNotice('A folder with that name already exists.', 'Duplicate folder');
        return;
      }
      const newFolderId = uid();
      highlightedFolderId = newFolderId;
      state.folders.push({ id: newFolderId, name: trimmed, collapsed: false, parentFolderId: state.currentFolderId || null });
      save();
      render();
    });
    function parseCsvLine(line) {
      const out = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (ch === ',' && !inQuotes) {
          out.push(current.trim());
          current = '';
          continue;
        }
        current += ch;
      }
      out.push(current.trim());
      return out;
    }
    function showBulkImportError(msg) {
      if (!bulkImportError) return;
      bulkImportError.textContent = msg;
      bulkImportError.style.display = 'block';
    }
    openBulkImport?.addEventListener('click', () => {
      if (!bulkImportModal || !bulkImportInput) return;
      bulkImportInput.value = '';
      if (bulkImportError) bulkImportError.style.display = 'none';
      bulkImportModal.showModal();
      setTimeout(() => bulkImportInput.focus(), 0);
    });
    bulkImportCancel?.addEventListener('click', () => {
      bulkImportModal?.close();
    });
    bulkImportSave?.addEventListener('click', () => {
      if (!bulkImportInput) return;
      if (bulkImportError) bulkImportError.style.display = 'none';

      const raw = bulkImportInput.value.trim();
      if (!raw) {
        showBulkImportError('Paste CSV rows to import.');
        return;
      }

      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) {
        showBulkImportError('Paste CSV rows to import.');
        return;
      }

      let rows = lines;
      const first = parseCsvLine(lines[0]).map(v => v.toLowerCase());
      if (first[0] === 'code') {
        rows = lines.slice(1);
      }
      if (!rows.length) {
        showBulkImportError('No data rows found after header.');
        return;
      }

      const folderMap = new Map(state.folders.map(f => [f.name.toLowerCase(), f.id]));
      const existingCodes = new Set(state.courses.map(c => (c.code || '').toUpperCase()));
      let imported = 0;
      let skipped = 0;
      let firstImportedCourseId = null;
      let firstCreatedFolderId = null;

      rows.forEach((line) => {
        const cols = parseCsvLine(line);
        const code = (cols[0] || '').trim().toUpperCase();
        if (!code || existingCodes.has(code)) {
          skipped += 1;
          return;
        }
        const title = (cols[1] || '').trim();
        const gradeRaw = (cols[2] || '').trim();
        const icon = autoIcon(code, (cols[3] || '').trim() || 'book-outline');
        const folderName = (cols[4] || '').trim();

        let folderId = null;
        if (folderName) {
          const key = folderName.toLowerCase();
          folderId = folderMap.get(key) || null;
          if (!folderId) {
            folderId = uid();
            state.folders.push({ id: folderId, name: folderName, collapsed: false, parentFolderId: null });
            folderMap.set(key, folderId);
            if (!firstCreatedFolderId) firstCreatedFolderId = folderId;
          }
        }

        const parsedGrade = gradeRaw === '' ? null : Number(gradeRaw);
        const grade = Number.isFinite(parsedGrade)
          ? Math.max(0, Math.min(100, parsedGrade))
          : null;

        const newCourseId = uid();
        state.courses.push({
          id: newCourseId,
          code,
          title,
          icon,
          grade,
          crncr: false,
          folderId
        });
        if (!firstImportedCourseId) firstImportedCourseId = newCourseId;
        existingCodes.add(code);
        imported += 1;
      });

      if (!imported) {
        showBulkImportError('No new courses imported. Check duplicates and CSV format.');
        return;
      }

      highlightedCardId = firstImportedCourseId;
      highlightedFolderId = firstCreatedFolderId;
      save();
      render();
      bulkImportModal?.close();
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
        const newCourseId = uid();
        highlightedCardId = newCourseId;
        state.courses.push({ id: newCourseId, code: normCode, title, icon: autoIcon(normCode, icon), grade: grade ?? null, crncr: false, folderId: null });
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
        let updatedState = { courses: [], folders: [], currentFolderId: null };
        if (updatedStateRaw) {
          try { updatedState = JSON.parse(updatedStateRaw) || updatedState; } catch(e) {}
        }
        state.courses = Array.isArray(updatedState.courses) ? updatedState.courses : [];
        state.folders = Array.isArray(updatedState.folders) ? updatedState.folders : [];
        state.currentFolderId = updatedState.currentFolderId || null;
        const folderIds = new Set(state.folders.map((folder) => folder.id));
        state.folders.forEach((folder) => {
          folder.parentFolderId = folder.parentFolderId || null;
          if (folder.parentFolderId && !folderIds.has(folder.parentFolderId)) {
            folder.parentFolderId = null;
          }
        });
        if (state.currentFolderId && !folderIds.has(state.currentFolderId)) {
          state.currentFolderId = null;
        }
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
    const profileCurrentPwInput = document.getElementById('profileCurrentPw');
    const profileNewPwInput = document.getElementById('profileNewPw');
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
    const profileNameError = document.getElementById('profileNameError');
    const profileEmailError = document.getElementById('profileEmailError');
    const profilePasswordError = document.getElementById('profilePasswordError');
    const profileStatus = document.getElementById('profileStatus');
    const profileLastUpdated = document.getElementById('profileLastUpdated');
    const undoToast = document.getElementById('undoToast');
    const undoText = document.getElementById('undoText');
    const undoBtn = document.getElementById('undoBtn');

    
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
      profilePasswordInput.value = "";
      if (profileCurrentPwInput) profileCurrentPwInput.value = "";
      if (profileNewPwInput) profileNewPwInput.value = "";
      profilePicInput.value = "";
      if (profileNameError) profileNameError.textContent = "";
      if (profileEmailError) profileEmailError.textContent = "";
      if (profilePasswordError) profilePasswordError.textContent = "";
      if (profileStatus) {
        profileStatus.textContent = "";
        profileStatus.classList.remove('is-success', 'is-error');
      }
      if (profileLastUpdated) {
        profileLastUpdated.textContent = profile.updatedAt
          ? `Last updated ${new Date(profile.updatedAt).toLocaleString()}`
          : "Not updated yet";
      }
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

    
    function setInlineError(el, input, message) {
      if (!el) return;
      el.textContent = message || "";
      if (input) {
        input.classList.toggle('input-error', !!message);
      }
    }

    function validateProfileInputs() {
      let valid = true;
      const nameVal = profileNameInput?.value.trim() || "";
      const emailVal = profileEmailInput?.value.trim() || "";
      const currentPw = profileCurrentPwInput?.value || "";
      const newPw = profileNewPwInput?.value || "";
      const confirmPw = profilePasswordInput?.value || "";

      if (nameVal && nameVal.length < 2) {
        setInlineError(profileNameError, profileNameInput, "Name should be at least 2 characters.");
        valid = false;
      } else {
        setInlineError(profileNameError, profileNameInput, "");
      }

      if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        setInlineError(profileEmailError, profileEmailInput, "Enter a valid email address.");
        valid = false;
      } else {
        setInlineError(profileEmailError, profileEmailInput, "");
      }

      const pwTouched = currentPw || newPw || confirmPw;
      if (pwTouched) {
        if (!newPw || newPw.length < 6) {
          setInlineError(profilePasswordError, profilePasswordInput, "New password must be at least 6 characters.");
          valid = false;
        } else if (newPw !== confirmPw) {
          setInlineError(profilePasswordError, profilePasswordInput, "Passwords do not match.");
          valid = false;
        } else if (!currentPw) {
          setInlineError(profilePasswordError, profilePasswordInput, "Enter your current password.");
          valid = false;
        } else {
          setInlineError(profilePasswordError, profilePasswordInput, "");
        }
      } else {
        setInlineError(profilePasswordError, profilePasswordInput, "");
      }

      return valid;
    }

    profileNameInput?.addEventListener('blur', validateProfileInputs);
    profileEmailInput?.addEventListener('blur', validateProfileInputs);
    profileCurrentPwInput?.addEventListener('blur', validateProfileInputs);
    profileNewPwInput?.addEventListener('blur', validateProfileInputs);
    profilePasswordInput?.addEventListener('blur', validateProfileInputs);

    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateProfileInputs()) {
          if (profileStatus) {
            profileStatus.textContent = "Fix the highlighted fields to save.";
            profileStatus.classList.add('is-error');
            profileStatus.classList.remove('is-success');
          }
          return;
        }

        const prevProfile = loadProfile() || {};
        const nextPassword = profileNewPwInput?.value
          ? profileNewPwInput.value
          : (prevProfile.password || "");
        const newProfile = {
          picture: profilePicPreview.src || prevProfile.picture || "",
          
          name: (profileNameInput.value.trim()) || prevProfile.name || (getAuth().fullName || "") || (getAuth().username || ""),
          nickname: (profileNickInput.value.trim()) || prevProfile.nickname || "",
          email: (profileEmailInput.value.trim()) || prevProfile.email || (getAuth().email || ""),
          password: nextPassword,
          updatedAt: new Date().toISOString()
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
        if (profileStatus) {
          profileStatus.textContent = "Saved";
          profileStatus.classList.add('is-success');
          profileStatus.classList.remove('is-error');
        }
        if (profileLastUpdated) {
          profileLastUpdated.textContent = `Last updated ${new Date(newProfile.updatedAt).toLocaleString()}`;
        }
        setTimeout(() => {
          profileModal.close();
        }, 550);
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
const tourTitle = document.getElementById('tourTitle');
const tourBody = document.getElementById('tourBody');
const tourStepLabel = document.getElementById('tourStepLabel');
const tourDots = document.getElementById('tourDots');
const tourSkip = document.getElementById('tourSkip');
const tourNext = document.getElementById('tourNext');
const openTourPreview = document.getElementById('openTourPreview');

const tourSteps = [
  {
    title: 'Welcome to MySemester',
    body: 'Let’s set up your dashboard in a few quick steps.',
    center: true,
    noArrow: true,
    spotlight: false
  },
  {
    title: 'Update your profile',
    body: 'Tap the profile icon to edit your name, email, and avatar.',
    selector: '#accountBtn',
    preferPos: 'right',
    spotlight: true,
    mobileWidth: 'min(360px, 60vw)',
    mobileMinHeight: 300,
    mobileOffsetX: -18
  },
  {
    title: 'Add your first course',
    body: 'Tap Add Course to create your first class.',
    selector: '.empty-state-card',
    clickSelector: '#emptyAddCourseBtn',
    preferPos: 'bottom',
    spotlight: true,
    requireClick: true,
    hideNext: true
  },
  {
    title: 'Course code',
    body: 'Enter the course code (e.g., ECO101).',
    selector: '#courseCodeField',
    highlightSelector: '#codeInput',
    spotlightSelector: '#courseCodeField',
    modalSpotlightSelector: '#courseCodeField',
    preferPos: 'left',
    alignCenter: true,
    spotlight: true,
    ensureModalOpen: true,
    requireInputSelector: '#codeInput',
    suppressHighlight: true,
    compact: true,
    modalPos: 'top',
    mobileWidth: 'min(500px, 86vw)',
    modalGap: -60
  },
  {
    title: 'Course name',
    body: 'Add the course name so it is easy to recognize.',
    selector: '#courseNameField',
    highlightSelector: '#titleInput',
    spotlightSelector: '#courseNameField',
    modalSpotlightSelector: '#courseNameField',
    preferPos: 'left',
    alignCenter: true,
    spotlight: true,
    ensureModalOpen: true,
    requireInputSelector: '#titleInput',
    suppressHighlight: true,
    compact: true,
    mobileWidth: 'min(500px, 86vw)',
    modalGap: -60
  },
  {
    title: 'Initial grade (optional)',
    body: 'Add a starting grade if you already have one.',
    selector: '#initialGradeField',
    highlightSelector: '#gradeInput',
    spotlightSelector: '#initialGradeField',
    modalSpotlightSelector: '#initialGradeField',
    preferPos: 'left',
    alignCenter: true,
    spotlight: true,
    ensureModalOpen: true,
    optionalInput: true,
    requireInputSelector: '#gradeInput',
    suppressHighlight: true,
    compact: true,
    modalPos: 'bottom',
    modalGap: -80
  },
  {
    title: 'Pick an icon',
    body: 'Use an Ionicons name for a custom icon (e.g., laptop-outline).',
    selector: '#iconField',
    highlightSelector: '#iconInput',
    spotlightSelector: '#iconField',
    modalSpotlightSelector: '#iconField',
    preferPos: 'left',
    alignCenter: true,
    spotlight: true,
    ensureModalOpen: true,
    optionalInput: true,
    requireInputSelector: '#iconInput',
    suppressHighlight: true,
    compact: true,
    modalPos: 'bottom',
    modalGap: -80
  },
  {
    title: 'Save your course',
    body: 'Tap Save Course to add it to your dashboard.',
    selector: '#saveCourse',
    highlightSelector: '#saveCourse',
    spotlightSelector: '#saveCourse',
    modalSpotlightSelector: '#saveCourse',
    preferPos: 'left',
    alignCenter: true,
    spotlight: true,
    ensureModalOpen: true,
    enableSave: true,
    suppressHighlight: true,
    compact: true,
    modalPos: 'top',
    modalGap: -300,
    hideNext: true,
    requireClick: true,
    clickSelector: '#saveCourse',
    nextOnClick: true
  },
  {
    title: 'Open your course',
    body: 'Tap your new course card to open it.',
    selector: '.card',
    highlightSelector: '.card',
    preferPos: 'bottom',
    alignCenter: true,
    spotlight: true,
    requireClick: true,
    hideNext: true
  }
];

let tourIndex = 0;
let tourTarget = null;
let tourTargetClickHandler = null;
let tourClickTarget = null;
let tourFieldHighlight = null;
let tourInputTarget = null;
let tourInputHandler = null;
let tourAllowedEls = [];

function clearTourHighlight() {
  if (tourTarget) {
    tourTarget.classList.remove('tour-highlight');
    tourTarget.classList.remove('tour-highlight-round');
    tourTarget.classList.remove('tour-highlight-card');
    tourTarget = null;
  }
}

function clearTargetClickHandler() {
  if (tourClickTarget && tourTargetClickHandler) {
    tourClickTarget.removeEventListener('click', tourTargetClickHandler);
  }
  tourTargetClickHandler = null;
  tourClickTarget = null;
}

function clearTourInputHandler() {
  if (tourInputTarget && tourInputHandler) {
    tourInputTarget.removeEventListener('input', tourInputHandler);
  }
  tourInputTarget = null;
  tourInputHandler = null;
}

function clearTourAllowed() {
  tourAllowedEls.forEach((el) => el.classList.remove('tour-allow'));
  tourAllowedEls = [];
}

function allowTourElement(el) {
  if (!el) return;
  el.classList.add('tour-allow');
  tourAllowedEls.push(el);
}

function clearTourFieldHighlight() {
  if (tourFieldHighlight) {
    tourFieldHighlight.classList.remove('tour-field-highlight');
    tourFieldHighlight = null;
  }
}

function updateTourModalInteractivity(step) {
  const modalStep = !!(step && step.ensureModalOpen);
  const currentField = step?.highlightSelector ? document.querySelector(step.highlightSelector) : null;
  const iconTryToggle = document.getElementById('iconTryToggle');
  const iconChipRow = document.getElementById('iconChipRow');
  const iconExtrasDisabled = modalStep && currentField !== iconInput;

  [codeInput, titleInput, gradeInput, iconInput].forEach((field) => {
    if (!field) return;
    field.disabled = modalStep && field !== currentField;
  });
  if (cancelCourse) cancelCourse.disabled = modalStep;
  if (saveCourse) {
    saveCourse.disabled = step?.enableSave ? false : (modalStep ? true : false);
  }

  if (iconTryToggle) {
    iconTryToggle.setAttribute('aria-disabled', iconExtrasDisabled ? 'true' : 'false');
    iconTryToggle.classList.toggle('disabled', iconExtrasDisabled);
  }
  if (iconChipRow) {
    iconChipRow.classList.toggle('disabled', iconExtrasDisabled);
  }
}

function updateSpotlight(target) {
  if (!tourOverlay) return;
  if (!target) {
    tourOverlay.classList.remove('spotlight');
    tourOverlay.style.removeProperty('--spot-x');
    tourOverlay.style.removeProperty('--spot-y');
    tourOverlay.style.removeProperty('--spot-w');
    tourOverlay.style.removeProperty('--spot-h');
    return;
  }
  if (!document.body.contains(target)) return;
  const rect = target.getBoundingClientRect();
  const pad = 8;
  tourOverlay.classList.add('spotlight');
  tourOverlay.style.setProperty('--spot-x', `${Math.max(rect.left - pad, 0)}px`);
  tourOverlay.style.setProperty('--spot-y', `${Math.max(rect.top - pad, 0)}px`);
  tourOverlay.style.setProperty('--spot-w', `${Math.min(rect.width + pad * 2, window.innerWidth)}px`);
  tourOverlay.style.setProperty('--spot-h', `${Math.min(rect.height + pad * 2, window.innerHeight)}px`);
}

function updateModalSpotlight(target) {
  if (!addCourseModal) return;
  if (!target) {
    addCourseModal.classList.remove('tour-mask-active');
    addCourseModal.style.removeProperty('--modal-spot-x');
    addCourseModal.style.removeProperty('--modal-spot-y');
    addCourseModal.style.removeProperty('--modal-spot-w');
    addCourseModal.style.removeProperty('--modal-spot-h');
    return;
  }
  if (!document.body.contains(target)) return;
  const rect = target.getBoundingClientRect();
  const modalRect = addCourseModal.getBoundingClientRect();
  const pad = 10;
  addCourseModal.classList.add('tour-mask-active');
  addCourseModal.style.setProperty('--modal-spot-x', `${Math.max(rect.left - modalRect.left - pad, 0)}px`);
  addCourseModal.style.setProperty('--modal-spot-y', `${Math.max(rect.top - modalRect.top - pad, 0)}px`);
  addCourseModal.style.setProperty('--modal-spot-w', `${Math.min(rect.width + pad * 2, modalRect.width)}px`);
  addCourseModal.style.setProperty('--modal-spot-h', `${Math.min(rect.height + pad * 2, modalRect.height)}px`);
}

function positionCalloutInModal(target) {
  const tourCard = document.querySelector('.tour-card');
  if (!tourCard || !target || !addCourseModal) return;
  const modalRect = addCourseModal.getBoundingClientRect();
  const cardRect = tourCard.getBoundingClientRect();
  const step = tourSteps[tourIndex] || {};
  const gap = typeof step.modalGap === 'number' ? step.modalGap : 16;
  const pos = step.modalPos || 'top';
  const left = (modalRect.width - cardRect.width) / 2;
  const top = pos === 'bottom'
    ? modalRect.height + gap
    : -cardRect.height - gap;
  tourCard.style.left = `${Math.round(left)}px`;
  tourCard.style.top = `${Math.round(top)}px`;
  tourCard.style.transform = 'translate(0, 0)';
  tourCard.dataset.pos = pos === 'bottom' ? 'bottom' : 'top';
}

function positionCallout(target) {
  const tourCard = document.querySelector('.tour-card');
  if (!tourCard) return;
  const step = tourSteps[tourIndex];
  if (!target || step.center) {
    tourCard.style.left = '50%';
    tourCard.style.top = '50%';
    tourCard.style.transform = 'translate(-50%, -50%)';
    tourCard.dataset.pos = 'top';
    return;
  }
  const rect = target.getBoundingClientRect();
  const cardRect = tourCard.getBoundingClientRect();
  let pos = step.preferPos || 'right';
  let top = rect.top + rect.height / 2 - cardRect.height / 2;
  let left = rect.right + 16;

  if (pos === 'right') {
    left = rect.left - cardRect.width - 16;
    left = Math.max(12, left);
  } else if (pos === 'left') {
    left = rect.right + 16;
    if (left + cardRect.width > window.innerWidth - 12) {
      pos = 'right';
      left = Math.max(12, rect.left - cardRect.width - 16);
    }
  } else if (pos === 'bottom') {
    top = rect.bottom + 16;
    left = rect.left + rect.width / 2 - cardRect.width / 2;
  } else if (pos === 'top') {
    top = rect.top - cardRect.height - 16;
    left = rect.left + rect.width / 2 - cardRect.width / 2;
  }

  if (window.innerWidth <= 640) {
    top += step.mobileOffsetY || 0;
    left += step.mobileOffsetX || 0;
  }
  top = Math.max(12, Math.min(top, window.innerHeight - cardRect.height - 12));
  if (step.alignCenter) {
    left = rect.left + rect.width / 2 - cardRect.width / 2;
  }
  left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));
  tourCard.style.left = `${Math.round(left)}px`;
  tourCard.style.top = `${Math.round(top)}px`;
  tourCard.style.transform = 'translate(0, 0)';
  tourCard.dataset.pos = pos;
}

function renderTour() {
  if (!tourOverlay) return;
  const step = tourSteps[tourIndex];
  const tourCard = document.querySelector('.tour-card');
  if (tourCard) {
    tourCard.style.display = '';
  }
  if (tourCard) {
    if (window.innerWidth <= 640 && step.mobileWidth) {
      tourCard.style.width = step.mobileWidth;
    } else {
      tourCard.style.removeProperty('width');
    }
    if (window.innerWidth <= 640 && step.mobileMinHeight) {
      tourCard.style.minHeight = `${step.mobileMinHeight}px`;
    } else {
      tourCard.style.removeProperty('min-height');
    }
  }
  tourCard?.classList.toggle('compact', !!step.compact);
  if (step.ensureModalOpen && addCourseModal && !addCourseModal.open) {
    addCourseModal.showModal();
  }
  updateTourModalInteractivity(step);
  let target = step.selector ? document.querySelector(step.selector) : null;
  const clickTarget = step.clickSelector ? document.querySelector(step.clickSelector) : target;
  if (!target && step.fallbackSelector) {
    target = document.querySelector(step.fallbackSelector);
  }
  tourTitle.textContent = step.title;
  tourBody.textContent = step.body;
  tourStepLabel.textContent = `${tourIndex + 1} of ${tourSteps.length}`;
  if (tourNext) {
    tourNext.textContent = step.nextLabel || 'Next';
    tourNext.dataset.action = step.nextAction || '';
    tourNext.style.display = step.hideNext ? 'none' : '';
  }
  if (tourSkip) {
    tourSkip.style.display = '';
  }
  const disableTarget = !!(step.disableTargetClick && !step.clickSelector);
  document.body.classList.toggle('tour-disable-target', disableTarget);
  document.body.classList.add('tour-restrict');
  tourDots.innerHTML = '';
  tourSteps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = `tour-dot${i === tourIndex ? ' active' : ''}`;
    tourDots.appendChild(dot);
  });
  clearTargetClickHandler();
  clearTourInputHandler();
  clearTourHighlight();
  clearTourFieldHighlight();
  clearTourAllowed();
  if (step.noArrow || step.center || !target || step.suppressHighlight) {
    tourCard?.classList.add('no-arrow');
    tourTarget = null;
  } else {
    tourCard?.classList.remove('no-arrow');
    tourTarget = target;
    tourTarget.classList.add('tour-highlight');
    if (tourTarget.classList.contains('empty-state-card')) {
      tourTarget.classList.add('tour-highlight-card');
    } else if (tourTarget.matches('.avatar-btn, .iconbtn, button')) {
      tourTarget.classList.add('tour-highlight-round');
    }
  }
  if (step.highlightSelector) {
    const highlightTarget = document.querySelector(step.highlightSelector);
    if (highlightTarget) {
      highlightTarget.classList.add('tour-field-highlight');
      tourFieldHighlight = highlightTarget;
      allowTourElement(highlightTarget);
    }
  }
  allowTourElement(clickTarget);
  const spotlightTarget = step.spotlightSelector
    ? document.querySelector(step.spotlightSelector)
    : tourTarget;
  const modalSpotlightTarget = step.modalSpotlightSelector
    ? document.querySelector(step.modalSpotlightSelector)
    : null;
  if (tourCard) {
    tourCard.classList.toggle('in-modal', !!modalSpotlightTarget);
    if (modalSpotlightTarget && addCourseModal && tourCard.parentElement !== addCourseModal) {
      addCourseModal.appendChild(tourCard);
    } else if (!modalSpotlightTarget && tourCard.parentElement !== document.body) {
      document.body.appendChild(tourCard);
    }
  }
  if (modalSpotlightTarget) {
    positionCalloutInModal(modalSpotlightTarget);
  } else {
    positionCallout(tourTarget);
  }
  if (step.spotlight && spotlightTarget && !modalSpotlightTarget) {
    updateSpotlight(spotlightTarget);
    requestAnimationFrame(() => {
      updateSpotlight(spotlightTarget);
      setTimeout(() => {
        updateSpotlight(spotlightTarget);
      }, 60);
    });
  } else {
    updateSpotlight(null);
  }
  updateModalSpotlight(modalSpotlightTarget);

  if (step.requireInputSelector && tourNext && !step.optionalInput) {
    const input = document.querySelector(step.requireInputSelector);
    if (input) {
      const updateNextState = () => {
        tourNext.disabled = !input.value.trim();
      };
      tourInputTarget = input;
      tourInputHandler = updateNextState;
      input.addEventListener('input', updateNextState);
      updateNextState();
      input.focus();
      allowTourElement(input);
    } else {
      tourNext.disabled = false;
    }
  }

  if (step.requireClick && clickTarget) {
    tourNext.disabled = true;
    tourTargetClickHandler = () => {
      if (step.nextOnClick && tourIndex < tourSteps.length - 1) {
        tourIndex += 1;
        setTimeout(() => {
          renderTour();
        }, 60);
        return;
      }
      if (tourIndex < tourSteps.length - 1) {
        tourIndex += 1;
        setTimeout(() => {
          renderTour();
        }, 60);
        return;
      }
      closeTour();
    };
    tourClickTarget = clickTarget;
    clickTarget.addEventListener('click', tourTargetClickHandler, { once: true });
  } else if (!step.requireInputSelector) {
    tourNext.disabled = false;
  }
}

function openTour() {
  if (!tourOverlay) return;
  document.body.classList.add('tour-lock');
  tourOverlay.classList.add('show');
  tourOverlay.style.display = 'flex';
  tourOverlay.setAttribute('aria-hidden', 'false');
  renderTour();
}

function closeTour() {
  if (!tourOverlay) return;
  document.body.classList.remove('tour-lock');
  document.body.classList.remove('tour-disable-target');
  document.body.classList.remove('tour-restrict');
  tourOverlay.classList.remove('show');
  tourOverlay.style.display = 'none';
  tourOverlay.setAttribute('aria-hidden', 'true');
  tourOverlay.classList.remove('spotlight');
  localStorage.setItem('ms_tutorial_seen', '1');
  localStorage.removeItem('ms_tutorial_start');
  const tourCard = document.querySelector('.tour-card');
  if (tourCard) {
    tourCard.style.display = 'none';
  }
  clearTargetClickHandler();
  clearTourInputHandler();
  clearTourHighlight();
  clearTourFieldHighlight();
  clearTourAllowed();
  updateTourModalInteractivity(null);
  updateModalSpotlight(null);
}

tourSkip?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeTour();
});

tourNext?.addEventListener('click', () => {
  const step = tourSteps[tourIndex];
  if (step?.nextAction === 'open-add-course') {
    openAddCourse?.click();
    if (tourIndex < tourSteps.length - 1) {
      tourIndex += 1;
      renderTour();
    }
    return;
  }
  if (tourIndex < tourSteps.length - 1) {
    tourIndex += 1;
    renderTour();
    return;
  }
  closeTour();
});

window.addEventListener('resize', () => {
  if (tourOverlay && tourOverlay.classList.contains('show')) {
    positionCallout(tourTarget);
    updateSpotlight(tourTarget);
    const step = tourSteps[tourIndex];
    const modalSpotlightTarget = step?.modalSpotlightSelector
      ? document.querySelector(step.modalSpotlightSelector)
      : null;
    updateModalSpotlight(modalSpotlightTarget);
  }
});

openTourPreview?.addEventListener('click', () => {
  tourIndex = 0;
  openTour();
});

const tutorialStart = localStorage.getItem('ms_tutorial_start');
const tutorialSeen = localStorage.getItem('ms_tutorial_seen');
if (tutorialStart === '1' && !tutorialSeen) {
  tourIndex = 0;
  setTimeout(() => {
    openTour();
  }, 120);
}
