(function () {
  const PAGE_SIZE = 120;
  let courses = [];
  let visibleLimit = PAGE_SIZE;

  const storedTheme = localStorage.getItem('uoft_theme') || 'light';
  document.documentElement.dataset.theme = storedTheme === 'dark' ? 'dark' : 'light';

  const els = {
    total: document.getElementById('catalogTotal'),
    visible: document.getElementById('catalogVisible'),
    search: document.getElementById('catalogSearch'),
    deptFilter: document.getElementById('deptFilter'),
    deptButton: document.getElementById('deptButton'),
    deptMenu: document.getElementById('deptMenu'),
    difficultyFilter: document.getElementById('difficultyFilter'),
    difficultyButton: document.getElementById('difficultyButton'),
    summary: document.getElementById('catalogSummary'),
    grid: document.getElementById('courseCatalogGrid'),
    loadMore: document.getElementById('catalogLoadMore')
  };

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

  function departmentOf(course) {
    return String(course.code || '').slice(0, 3);
  }

  function closeSelects(exceptWrap) {
    document.querySelectorAll('[data-catalog-select].open').forEach((wrap) => {
      if (wrap !== exceptWrap) wrap.classList.remove('open');
    });
  }

  function initSelects() {
    document.querySelectorAll('[data-catalog-select]').forEach((wrap) => {
      const button = wrap.querySelector('.planner-select-button');
      const input = wrap.querySelector('input[type="hidden"]');
      const menu = wrap.querySelector('.planner-select-menu');
      button?.addEventListener('click', (event) => {
        event.preventDefault();
        const nextOpen = !wrap.classList.contains('open');
        closeSelects(nextOpen ? wrap : null);
        wrap.classList.toggle('open', nextOpen);
      });
      menu?.addEventListener('click', (event) => {
        const option = event.target.closest('.planner-select-option');
        if (!option) return;
        const value = option.dataset.value || '';
        if (input) input.value = value;
        if (button) button.textContent = option.textContent.trim();
        menu.querySelectorAll('.planner-select-option').forEach((item) => {
          item.classList.toggle('is-selected', item === option);
        });
        wrap.classList.remove('open');
        visibleLimit = PAGE_SIZE;
        renderCatalog();
      });
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-catalog-select]')) closeSelects();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSelects();
    });
  }

  function buildDepartmentMenu() {
    const departments = Array.from(new Set(courses.map(departmentOf))).filter(Boolean).sort();
    els.deptMenu.innerHTML = [
      '<button type="button" class="planner-select-option is-selected" data-value="">All departments</button>',
      ...departments.map((dept) => `<button type="button" class="planner-select-option" data-value="${escapeHtml(dept)}">${escapeHtml(dept)}</button>`)
    ].join('');
  }

  function courseMatches(course, query, dept, difficulty) {
    if (dept && departmentOf(course) !== dept) return false;
    if (difficulty && course.roughDifficulty !== difficulty) return false;
    if (!query) return true;
    const haystack = [
      course.code,
      course.title,
      course.roughDifficulty,
      course.confidenceLevel,
      ...(course.commonPaths || [])
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function renderCatalog() {
    const query = (els.search.value || '').trim().toLowerCase();
    const dept = els.deptFilter.value;
    const difficulty = els.difficultyFilter.value;
    const filtered = courses.filter((course) => courseMatches(course, query, dept, difficulty));
    const visible = filtered.slice(0, visibleLimit);
    const canLoadMore = visible.length < filtered.length;

    els.total.textContent = String(courses.length);
    els.visible.textContent = String(visible.length);
    els.summary.textContent = filtered.length > visible.length
      ? `Showing ${visible.length} of ${filtered.length} matching courses. Load more or narrow your search to see fewer.`
      : `Showing ${filtered.length} matching course${filtered.length === 1 ? '' : 's'}.`;
    els.loadMore.hidden = !canLoadMore;
    els.loadMore.innerHTML = canLoadMore
      ? `<ion-icon name="add-circle-outline"></ion-icon> Load more courses (${Math.min(PAGE_SIZE, filtered.length - visible.length)} more)`
      : '<ion-icon name="add-circle-outline"></ion-icon> Load more courses';

    if (!filtered.length) {
      els.grid.innerHTML = '<div class="loading-card">No courses match those filters.</div>';
      return;
    }

    els.grid.innerHTML = visible.map((course) => `
      <article class="catalog-course-card">
        <div class="catalog-course-top">
          <span class="catalog-code">${escapeHtml(course.code)}</span>
          <span class="badge ${difficultyClass(course.roughDifficulty)}">${escapeHtml(course.roughDifficulty)}</span>
        </div>
        <h3>${escapeHtml(course.title)}</h3>
        <div class="badge-row">
          ${(course.commonPaths || []).slice(0, 4).map((path) => `<span class="badge">${escapeHtml(path)}</span>`).join('')}
        </div>
        <p>${escapeHtml(course.notes)}</p>
      </article>
    `).join('');
  }

  els.search.addEventListener('input', () => {
    visibleLimit = PAGE_SIZE;
    renderCatalog();
  });

  els.loadMore.addEventListener('click', () => {
    visibleLimit += PAGE_SIZE;
    renderCatalog();
  });

  fetch('/data/ai-planner-courses.json')
    .then((res) => res.json())
    .then((data) => {
      courses = Array.isArray(data)
        ? data.slice().sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')) || String(a.title || '').localeCompare(String(b.title || '')))
        : [];
      buildDepartmentMenu();
      initSelects();
      renderCatalog();
    })
    .catch(() => {
      els.summary.textContent = 'Could not load the course catalog.';
      els.grid.innerHTML = '<div class="loading-card">Try refreshing the page.</div>';
    });
})();
