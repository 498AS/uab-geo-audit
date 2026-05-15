(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const slidesRoot = document.querySelector('.slides');
  if (!slides.length || !slidesRoot) return;

  const state = {
    activeIndex: 0,
    lastNonIndex: 1,
    mode: 'slides',
    transition: document.body.dataset.deckTransition || 'slide',
    sidebarHideTimer: null,
    presenter: {
      enabled: false,
      startedAt: 0,
      timerId: null,
      panel: null,
      timerEl: null,
      progressEl: null,
      notesEl: null,
      nextTitleEl: null,
      nextSlideEl: null,
      previewSlideIndex: null,
    },
    touch: {
      startX: 0,
      startY: 0,
      startAt: 0,
      active: false,
      identifier: null,
      lastGestureNavAt: 0,
    },
  };

  const sidebarEdge = document.createElement('div');
  sidebarEdge.className = 'sidebar__edge';

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar__title">Minimap</div>
    <div class="sidebar__hint">M: toggle · I: index · P: presenter · Click para ir a slide</div>
    <div id="sidebarList"></div>
  `;

  slidesRoot.after(sidebar);
  document.body.appendChild(sidebarEdge);

  const hasIndexSlide = slides[0]?.getAttribute('data-kind') === 'index';
  const slideCounter = document.createElement('div');
  slideCounter.className = 'slide-counter';
  slideCounter.innerHTML = `<span class="current">1</span>/<span class="total">1</span>`;
  document.body.appendChild(slideCounter);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function getMeta(slide, idx) {
    const title = slide.getAttribute('data-title')
      || slide.querySelector('.h1')?.textContent?.trim()
      || `Slide ${idx + 1}`;
    const section = slide.getAttribute('data-section')
      || slide.querySelector('.kicker')?.textContent?.trim()
      || 'General';
    return { idx, title, section };
  }

  function extractNotes(slide) {
    const attrNotes = slide.getAttribute('data-notes');
    if (attrNotes && attrNotes.trim()) return attrNotes.trim();

    const html = slide.innerHTML || '';
    const match = html.match(/<!--\s*notes:\s*([\s\S]*?)-->/i);
    return match?.[1]?.trim() || '';
  }

  function formatElapsed(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const sec = (totalSec % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  function readHash() {
    const match = window.location.hash.match(/^#\/(\d+)$/);
    if (!match) return null;
    const n = Number(match[1]);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(slides.length, n)) - 1;
  }

  function writeHash(idx) {
    try {
      window.location.hash = `#/${idx + 1}`;
    } catch {}
  }

  function clampIndex(value) {
    return Math.max(0, Math.min(slides.length - 1, value));
  }

  function updateSlideCounter() {
    if (!slideCounter) return;

    if (state.mode !== 'slides' || state.presenter.enabled) {
      slideCounter.style.display = 'none';
      return;
    }

    const offset = hasIndexSlide ? 1 : 0;
    if (state.activeIndex < offset) {
      slideCounter.style.display = 'none';
      return;
    }

    const current = (state.activeIndex - offset) + 1;
    const total = Math.max(1, slides.length - offset);

    slideCounter.style.display = '';
    const curEl = slideCounter.querySelector('.current');
    const totEl = slideCounter.querySelector('.total');
    if (curEl) curEl.textContent = String(current);
    if (totEl) totEl.textContent = String(total);
  }

  function parseSwipeNumber(rawValue, fallback, min = 0) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return parsed;
  }

  function getSwipeConfig() {
    const threshold = parseSwipeNumber(document.body.dataset.swipeThreshold, 56, 1);
    const maxDuration = parseSwipeNumber(document.body.dataset.swipeMaxDuration, 550, 1);
    const axisLockRatio = parseSwipeNumber(document.body.dataset.swipeAxisLockRatio, 1.2, 0.1);
    return { threshold, maxDuration, axisLockRatio };
  }

  function enhanceTables() {
    const tables = Array.from(document.querySelectorAll('table.data-table'));
    for (const table of tables) {
      const parent = table.parentElement;
      if (parent && parent.classList.contains('data-table-wrap')) continue;
      const wrap = document.createElement('div');
      wrap.className = 'data-table-wrap';
      table.before(wrap);
      wrap.appendChild(table);
    }
  }

  function toYouTubeId(url) {
    const m1 = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m2) return m2[1];
    const m3 = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m3) return m3[1];
    return '';
  }

  function isYouTubeHost(host) {
    const h = String(host || '').toLowerCase();
    return h === 'youtu.be' || h.endsWith('.youtu.be') || h === 'youtube.com' || h.endsWith('.youtube.com');
  }

  function isVimeoHost(host) {
    const h = String(host || '').toLowerCase();
    return h === 'vimeo.com' || h.endsWith('.vimeo.com');
  }

  function toVimeoId(url) {
    const m1 = url.match(/vimeo\.com\/(\d{6,})/);
    if (m1) return m1[1];
    const m2 = url.match(/player\.vimeo\.com\/video\/(\d{6,})/);
    if (m2) return m2[1];
    return '';
  }

  function resolveVideoEmbedUrl(raw) {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('youtube:')) {
      const id = v.slice('youtube:'.length).trim();
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : '';
    }
    if (v.startsWith('vimeo:')) {
      const id = v.slice('vimeo:'.length).trim();
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1` : '';
    }
    if (/^https?:\/\//.test(v)) {
      try {
        const u = new URL(v);
        if (isYouTubeHost(u.hostname)) {
          const yt = toYouTubeId(v);
          if (yt) return `https://www.youtube.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0`;
        }
        if (isVimeoHost(u.hostname)) {
          const vm = toVimeoId(v);
          if (vm) return `https://player.vimeo.com/video/${encodeURIComponent(vm)}?autoplay=1`;
        }
      } catch {}
      // Direct embed URL path: keep as-is for other providers.
      return v;
    }
    return '';
  }

  function enhanceVideoEmbeds() {
    const nodes = Array.from(document.querySelectorAll('.video-embed'));
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.querySelector('iframe')) continue;
      if (node.querySelector('.video-embed__btn')) continue;

      const raw = node.dataset.video || node.getAttribute('data-video') || '';
      const embedUrl = resolveVideoEmbedUrl(raw);
      if (!embedUrl) continue;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-embed__btn';
      btn.setAttribute('aria-label', 'Load video');

      const hint = document.createElement('div');
      hint.className = 'video-embed__hint';
      hint.textContent = 'Click to load video';

      btn.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.loading = 'lazy';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        node.innerHTML = '';
        node.appendChild(iframe);
      });

      btn.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          btn.click();
        }
      });

      node.appendChild(btn);
      node.appendChild(hint);
    }
  }

  function enhanceCodeBlocks() {
    try {
      if (window.hljs && typeof window.hljs.highlightAll === 'function') {
        window.hljs.highlightAll();
      }
    } catch {}
  }

  function ensurePresenterStyle() {
    if (document.getElementById('deck-presenter-style')) return;

    const style = document.createElement('style');
    style.id = 'deck-presenter-style';
    style.textContent = `
      body.deck--presenter .slides {
        padding-right: min(36vw, 460px);
      }

      body.deck--presenter .slide {
        width: min(900px, 100%);
      }

      .presenter-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: min(36vw, 460px);
        height: 100vh;
        border-left: 1px solid var(--subtle);
        background: rgba(0, 0, 0, 0.96);
        padding: 18px 16px;
        display: grid;
        grid-template-rows: auto auto auto auto 1fr;
        gap: 12px;
        z-index: 98;
        overflow: hidden;
      }

      .presenter-panel__timer {
        font-family: var(--font-mono);
        font-size: 30px;
        font-weight: 700;
        color: var(--primary);
      }

      .presenter-panel__progress {
        font-family: var(--font-mono);
        color: var(--muted);
        font-size: 12px;
      }

      .presenter-panel__notes {
        border: 1px solid var(--subtle);
        background: rgba(255, 255, 255, 0.02);
        padding: 10px 12px;
        min-height: 100px;
        color: var(--fg);
        font-size: 13px;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow: auto;
      }

      .presenter-panel__nextTitle {
        color: var(--primary);
        font-size: 11px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }

      .presenter-panel__nextSlide {
        border: 1px solid var(--subtle);
        background: rgba(255, 255, 255, 0.02);
        overflow: auto;
        padding: 8px;
      }

      .presenter-panel__nextSlide .slide {
        display: block !important;
        width: 100% !important;
        min-height: auto !important;
        padding: 16px !important;
        animation: none !important;
        transform: scale(0.54);
        transform-origin: top left;
        width: 185% !important;
      }

      @media (max-width: 980px) {
        .presenter-panel {
          position: fixed;
          width: 100%;
          height: 42vh;
          top: auto;
          bottom: 0;
          border-left: none;
          border-top: 1px solid var(--subtle);
          grid-template-rows: auto auto auto auto 1fr;
        }

        body.deck--presenter .slides {
          padding-right: 32px;
          padding-bottom: 45vh;
        }
      }
    `;

    document.head.appendChild(style);
  }

  const meta = slides.map((slide, idx) => getMeta(slide, idx));
  const bySection = new Map();

  for (const item of meta) {
    const key = item.section || 'General';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(item);
  }

  const renderer = {
    renderSlides() {
      document.body.dataset.deckMode = state.mode;
      document.body.dataset.deckTransition = state.transition;
      slides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === state.activeIndex);
      });
    },

    renderSidebar() {
      const root = document.getElementById('sidebarList');
      if (!root) return;
      root.innerHTML = '';

      for (const [section, items] of bySection.entries()) {
        const sectionNode = document.createElement('div');
        sectionNode.className = 'sidebar__section';
        sectionNode.innerHTML = `<div class="sidebar__sectionName">${escapeHtml(section)}</div>`;

        for (const item of items) {
          const row = document.createElement('div');
          row.className = 'sidebar__item' + (item.idx === state.activeIndex ? ' active' : '');
          row.innerHTML = `<div class="sidebar__num">${item.idx + 1}</div><div class="sidebar__txt">${escapeHtml(item.title)}</div>`;
          row.addEventListener('click', () => {
            runtime.openSlide(item.idx);
            runtime.softOpenSidebar();
          });
          sectionNode.appendChild(row);
        }

        root.appendChild(sectionNode);
      }
    },

    renderIndex() {
      const root = document.getElementById('indexGroups');
      if (!root) return;
      root.innerHTML = '';

      for (const [section, items] of bySection.entries()) {
        const group = document.createElement('div');
        group.style.marginTop = '18px';
        group.innerHTML = `<div class="index__section">${escapeHtml(section)}</div>`;

        const grid = document.createElement('div');
        grid.className = 'index__grid';

        for (const item of items) {
          const card = document.createElement('div');
          card.className = 'index__card';
          card.innerHTML = `
            <div class="index__meta">
              <div class="index__section">#${item.idx + 1}</div>
              <div class="index__section">${escapeHtml(section)}</div>
            </div>
            <div class="index__title">${escapeHtml(item.title)}</div>
          `;
          card.addEventListener('click', () => runtime.openSlide(item.idx));
          grid.appendChild(card);
        }

        group.appendChild(grid);
        root.appendChild(group);
      }
    }
  };

  const runtime = {
    setMode(nextMode) {
      state.mode = nextMode;
      renderer.renderSlides();
      updateSlideCounter();
    },

    setTransition(nextTransition) {
      state.transition = String(nextTransition || 'none');
      document.body.dataset.deckTransition = state.transition;
    },

    openSlide(idx, options = {}) {
      state.activeIndex = clampIndex(idx);
      this.setMode('slides');
      renderer.renderSidebar();
      if (state.activeIndex === 0) renderer.renderIndex();
      this.updatePresenter();
      updateSlideCounter();
      if (!options.fromHash) writeHash(state.activeIndex);
    },

    next() {
      this.openSlide(state.activeIndex + 1);
    },

    prev() {
      this.openSlide(state.activeIndex - 1);
    },

    openIndex() {
      this.openSlide(0);
      this.softOpenSidebar();
    },

    toggleIndex() {
      if (state.activeIndex === 0) {
        this.openSlide(state.lastNonIndex);
        return;
      }
      state.lastNonIndex = state.activeIndex;
      this.openIndex();
    },

    openSidebar() {
      sidebar.classList.add('open');
    },

    closeSidebar() {
      sidebar.classList.remove('open');
    },

    scheduleSidebarHide() {
      clearTimeout(state.sidebarHideTimer);
      state.sidebarHideTimer = setTimeout(() => this.closeSidebar(), 1800);
    },

    softOpenSidebar() {
      this.openSidebar();
      this.scheduleSidebarHide();
    },

    ensurePresenterPanel() {
      if (state.presenter.panel) return;
      ensurePresenterStyle();

      const panel = document.createElement('aside');
      panel.className = 'presenter-panel';
      panel.innerHTML = `
        <div class="presenter-panel__timer">00:00</div>
        <div class="presenter-panel__progress"></div>
        <div class="presenter-panel__notes">Sin notas para esta slide.</div>
        <div class="presenter-panel__nextTitle">Siguiente</div>
        <div class="presenter-panel__nextSlide"></div>
      `;

      document.body.appendChild(panel);
      state.presenter.panel = panel;
      state.presenter.timerEl = panel.querySelector('.presenter-panel__timer');
      state.presenter.progressEl = panel.querySelector('.presenter-panel__progress');
      state.presenter.notesEl = panel.querySelector('.presenter-panel__notes');
      state.presenter.nextTitleEl = panel.querySelector('.presenter-panel__nextTitle');
      state.presenter.nextSlideEl = panel.querySelector('.presenter-panel__nextSlide');
      state.presenter.previewSlideIndex = null;
    },

    enablePresenter(startTimer = false) {
      state.presenter.enabled = true;
      document.body.classList.add('deck--presenter');
      this.ensurePresenterPanel();

      if (startTimer || !state.presenter.startedAt) {
        state.presenter.startedAt = Date.now();
      }

      if (!state.presenter.timerId) {
        state.presenter.timerId = setInterval(() => this.updatePresenter(), 1000);
      }

      this.updatePresenter();
      updateSlideCounter();
    },

    disablePresenter() {
      state.presenter.enabled = false;
      document.body.classList.remove('deck--presenter');

      if (state.presenter.timerId) {
        clearInterval(state.presenter.timerId);
        state.presenter.timerId = null;
      }

      if (state.presenter.panel) {
        state.presenter.panel.remove();
        state.presenter.panel = null;
        state.presenter.timerEl = null;
        state.presenter.progressEl = null;
        state.presenter.notesEl = null;
        state.presenter.nextTitleEl = null;
        state.presenter.nextSlideEl = null;
        state.presenter.previewSlideIndex = null;
      }

      updateSlideCounter();
    },

    togglePresenter() {
      if (state.presenter.enabled) {
        this.disablePresenter();
      } else {
        this.enablePresenter(true);
      }
    },

    updatePresenter() {
      if (!state.presenter.enabled) return;
      this.ensurePresenterPanel();

      const currentSlide = slides[state.activeIndex];
      const nextIdx = state.activeIndex + 1;
      const hasNext = nextIdx < slides.length;
      const nextSlide = hasNext ? slides[nextIdx] : null;

      if (state.presenter.timerEl) {
        state.presenter.timerEl.textContent = formatElapsed(Date.now() - state.presenter.startedAt);
      }

      if (state.presenter.progressEl) {
        state.presenter.progressEl.textContent = `Slide ${state.activeIndex + 1}/${slides.length}`;
      }

      if (state.presenter.notesEl) {
        const notes = extractNotes(currentSlide);
        state.presenter.notesEl.textContent = notes || 'Sin notas para esta slide.';
      }

      if (state.presenter.nextTitleEl) {
        state.presenter.nextTitleEl.textContent = hasNext
          ? `Siguiente: ${meta[nextIdx]?.title || `Slide ${nextIdx + 1}`}`
          : 'Siguiente: fin del deck';
      }

      if (state.presenter.nextSlideEl) {
        const previewIndex = hasNext ? nextIdx : -1;
        if (state.presenter.previewSlideIndex !== previewIndex) {
          state.presenter.nextSlideEl.innerHTML = '';
          if (nextSlide) {
            const clone = nextSlide.cloneNode(true);
            clone.classList.remove('active');
            state.presenter.nextSlideEl.appendChild(clone);
          }
          state.presenter.previewSlideIndex = previewIndex;
        }
      }
    },

    getState() {
      return {
        activeIndex: state.activeIndex,
        lastNonIndex: state.lastNonIndex,
        mode: state.mode,
        transition: state.transition,
        totalSlides: slides.length,
        presenter: {
          enabled: state.presenter.enabled,
          startedAt: state.presenter.startedAt,
        },
        swipe: getSwipeConfig(),
      };
    }
  };

  sidebarEdge.addEventListener('mouseenter', () => runtime.softOpenSidebar());
  sidebar.addEventListener('mouseenter', () => {
    runtime.openSidebar();
    clearTimeout(state.sidebarHideTimer);
  });
  sidebar.addEventListener('mouseleave', () => runtime.scheduleSidebarHide());

  slidesRoot.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      state.touch.active = false;
      state.touch.identifier = null;
      return;
    }

    const point = event.touches[0];
    const target = event.target;
    if (target instanceof Element && target.closest('.sidebar, .presenter-panel')) return;

    state.touch.active = true;
    state.touch.startX = point.clientX;
    state.touch.startY = point.clientY;
    state.touch.startAt = Date.now();
    state.touch.identifier = point.identifier;
  }, { passive: true });

  slidesRoot.addEventListener('touchend', (event) => {
    if (!state.touch.active) return;
    if (event.touches.length !== 0) {
      state.touch.active = false;
      state.touch.identifier = null;
      return;
    }

    const point = Array.from(event.changedTouches || []).find(
      (touch) => touch.identifier === state.touch.identifier
    );
    state.touch.active = false;
    state.touch.identifier = null;
    if (!point) return;

    const dx = point.clientX - state.touch.startX;
    const dy = point.clientY - state.touch.startY;
    const elapsed = Date.now() - state.touch.startAt;
    const cfg = getSwipeConfig();

    if (elapsed > cfg.maxDuration) return;
    if (Math.abs(dx) < cfg.threshold) return;
    if (Math.abs(dx) <= Math.abs(dy) * cfg.axisLockRatio) return;

    state.touch.lastGestureNavAt = Date.now();
    if (dx < 0) runtime.next();
    else runtime.prev();
  }, { passive: true });

  slidesRoot.addEventListener('touchcancel', () => {
    state.touch.active = false;
    state.touch.identifier = null;
  }, { passive: true });

  function isMobileTapToAdvance() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return true;
    } catch {}
    return false;
  }

  slidesRoot.addEventListener('click', (event) => {
    if (!isMobileTapToAdvance()) return;
    if (state.mode !== 'slides') return;
    if (state.presenter.enabled) return;
    if (Date.now() - (state.touch.lastGestureNavAt || 0) < 450) return;

    const target = event.target;
    if (target instanceof Element) {
      if (target.closest('.sidebar, .presenter-panel')) return;
      if (target.closest('button, input, textarea, select, a, label, [role="button"], [contenteditable="true"]')) return;
      if (target.closest('.video-embed, pre, code, table, .data-table-wrap')) return;
    }

    try {
      const sel = window.getSelection?.();
      if (sel && String(sel).trim()) return;
    } catch {}

    runtime.next();
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest('button, input, textarea, select, a, [contenteditable="true"]')) return;
    }

    if (event.key === 'm' || event.key === 'M') {
      if (sidebar.classList.contains('open')) runtime.closeSidebar();
      else runtime.softOpenSidebar();
      return;
    }

    if (event.key === 'i' || event.key === 'I') {
      runtime.toggleIndex();
      return;
    }

    if (event.key === 'p' || event.key === 'P') {
      runtime.togglePresenter();
      return;
    }

    if (state.mode !== 'slides') return;

    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      runtime.next();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      runtime.prev();
    }
  });

  window.addEventListener('hashchange', () => {
    const idx = readHash();
    if (idx !== null) runtime.openSlide(idx, { fromHash: true });
  });

  window.deckRuntime = runtime;

  enhanceTables();
  enhanceVideoEmbeds();
  enhanceCodeBlocks();

  renderer.renderSidebar();
  const idxFromHash = readHash();
  if (idxFromHash !== null) runtime.openSlide(idxFromHash, { fromHash: true });
  else runtime.openSlide(0);

  const isPresenterByQuery = new URLSearchParams(window.location.search).get('presenter') === '1';
  if (isPresenterByQuery) {
    runtime.enablePresenter(true);
  }
})();
