/* Native, progressive motion. No element is hidden waiting for an observer. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const css = getComputedStyle(document.documentElement);
  const number = name => parseFloat(css.getPropertyValue(name));
  const tokens = {
    feedback: number('--motion-feedback'), interface: number('--motion-interface'),
    reveal: number('--motion-reveal'), stagger: number('--motion-stagger'),
    distance: number('--motion-distance'), entrance: css.getPropertyValue('--ease-entrance').trim(),
    ease: css.getPropertyValue('--ease-interface').trim()
  };
  const animations = new Set();
  const panels = new Map();
  function animate(element, frames, options = {}) {
    if (!element || preference.matches || !element.animate || document.hidden) return null;
    try {
      const animation = element.animate(frames, { duration: tokens.reveal, easing: tokens.entrance, ...options });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      return animation;
    } catch { return null; }
  }
  function enter(element, delay = 0, distance = tokens.distance) {
    return animate(element, [{ opacity: .15, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'none' }], { delay });
  }
  function settle() {
    panels.forEach(state => state.finish());
    animations.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
    animations.clear();
  }
  preference.addEventListener('change', () => { if (preference.matches) settle(); });
  document.addEventListener('motionpreferencechange', () => { if (preference.matches) settle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });

  function enhanceDetails(root = document) {
    root.querySelectorAll('details').forEach((details, index) => {
      if (panels.has(details)) return;
      const summary = details.querySelector('summary');
      if (!summary) return;
      const panel = document.createElement('div');
      panel.className = 'detail-panel';
      panel.id = `${details.id || 'faq-' + index}-panel`;
      [...details.childNodes].filter(node => node !== summary).forEach(node => panel.append(node));
      details.append(panel);
      summary.setAttribute('aria-controls', panel.id);
      const state = { desired: details.open, animation: null, finish: null };
      function sync() {
        details.dataset.expanded = String(state.desired);
        summary.setAttribute('aria-expanded', String(state.desired));
        panel.inert = !state.desired;
      }
      state.finish = () => {
        const animation = state.animation;
        state.animation = null;
        animation?.cancel();
        details.open = state.desired;
        panel.style.height = '';
        panel.style.overflow = '';
        sync();
      };
      state.set = (open, instant = false) => {
        const start = details.open ? panel.getBoundingClientRect().height : 0;
        state.animation?.cancel();
        state.animation = null;
        state.desired = open;
        if (!open && panel.contains(document.activeElement)) summary.focus({ preventScroll: true });
        sync();
        if (instant || preference.matches || !panel.animate) { state.finish(); return; }
        details.open = true;
        panel.style.height = '';
        const end = open ? panel.getBoundingClientRect().height : 0;
        panel.style.overflow = 'clip';
        const animation = animate(panel, [{ height: `${start}px` }, { height: `${end}px` }], {
          duration: details.classList.contains('service') ? tokens.interface : tokens.interface * .8,
          easing: tokens.ease
        });
        if (!animation) { state.finish(); return; }
        state.animation = animation;
        animation.finished.then(() => { if (state.animation === animation) state.finish(); }, () => {});
        if (open && start === 0) {
          animate(panel.firstElementChild, [{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: tokens.interface });
          // Related list items settle together; no text splitting or content delay.
          panel.querySelectorAll('li').forEach((item, index) => enter(item, Math.min(index, 5) * 35, 6));
        }
      };
      summary.addEventListener('click', event => { event.preventDefault(); state.set(!state.desired); });
      details.addEventListener('toggle', () => {
        if (!state.animation && details.open !== state.desired) { state.desired = details.open; sync(); }
      });
      panels.set(details, state);
      sync();
      // Content/width changes finish to intrinsic height instead of keeping stale measurements.
      if (typeof ResizeObserver === 'function') {
        let previous;
        const observer = new ResizeObserver(entries => {
          const size = entries.map(e => `${e.contentRect.width}:${e.contentRect.height}`).join('|');
          const measurable = entries.every(e => e.contentRect.width > 0 && e.contentRect.height > 0);
          if (measurable && previous !== undefined && previous !== size && state.animation) state.finish();
          if (measurable) previous = size;
        });
        [...panel.children].forEach(child => observer.observe(child));
      }
    });
  }

  let filterVersion = 0;
  let filterAnimations = [];
  async function filter(category, instant = false) {
    scenes?.finishRows();
    const version = ++filterVersion;
    filterAnimations.forEach(animation => animation?.cancel());
    filterAnimations = [];
    const list = document.querySelector('#service-list');
    const rows = [...list.querySelectorAll('.service')];
    const show = row => category === 'all' || row.dataset.category === category;
    const buttons = [...document.querySelectorAll('[data-filter]')];
    buttons.forEach(button => {
      const active = button.dataset.filter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const focus = document.activeElement;
    if (rows.some(row => !show(row) && row.contains(focus))) buttons.find(b => b.dataset.filter === category)?.focus({ preventScroll: true });
    // Batch initial layout reads before hiding outgoing rows.
    const before = new Map(rows.filter(row => !row.hidden).map(row => [row, row.getBoundingClientRect().top]));
    const oldHeight = list.getBoundingClientRect().height;
    rows.forEach(row => { row.inert = !show(row); });
    if (!instant && !preference.matches) {
      const outgoing = rows.filter(row => !row.hidden && !show(row)).map(row => animate(row, [{ opacity: 1 }, { opacity: 0 }], { duration: 100 }));
      filterAnimations.push(...outgoing);
      await Promise.all(outgoing.map(a => a?.finished.catch(() => {})));
    }
    if (version !== filterVersion) return;
    rows.forEach(row => { row.hidden = !show(row); row.inert = !show(row); });
    if (instant || preference.matches) return;
    const visible = rows.filter(show);
    const after = new Map(visible.map(row => [row, row.getBoundingClientRect().top]));
    const height = list.getBoundingClientRect().height;
    filterAnimations.push(animate(list, [{ height: `${oldHeight}px` }, { height: `${height}px` }], { duration: tokens.interface, easing: tokens.ease }));
    visible.forEach((row, index) => {
      const delta = before.has(row) ? Math.max(-28, Math.min(28, before.get(row) - after.get(row))) : 16;
      filterAnimations.push(animate(row, [{ opacity: before.has(row) ? 1 : .2, transform: `translateY(${delta}px)` }, { opacity: 1, transform: 'none' }], {
        duration: tokens.interface, delay: before.has(row) ? 0 : Math.min(index, 3) * 40
      }));
    });
  }

  function ambientMotion() {
    if (typeof Element.prototype.animate !== 'function' || typeof IntersectionObserver !== 'function') return;
    const compact = matchMedia('(max-width: 767px), (pointer: coarse)');
    const states = new Map();
    document.querySelectorAll('.ambient-plane, .ambient-rail, .hero-depth > img, .brand-image > img').forEach(element => {
      states.set(element, { element, animation: null, visible: false, complete: false });
    });
    function refresh() {
      states.forEach(state => {
        if (preference.matches) {
          state.animation?.cancel(); state.animation = null; state.complete = true;
          state.element.style.willChange = ''; return;
        }
        if (state.complete) return;
        if (!state.visible || document.hidden) {
          state.animation?.pause(); state.element.style.willChange = ''; return;
        }
        if (!state.animation) {
          const distance = compact.matches ? 3 : 7;
          try {
            // One short settle, then stillness: no continuous motion needs a pause control.
            const animation = state.element.animate([
              { translate: '0px 0px' }, { translate: `0px -${distance}px` }, { translate: '0px 0px' }
            ], { duration: 4200, iterations: 1, easing: 'ease-in-out' });
            animation.id = 'artwork-settle'; state.animation = animation;
            animation.finished.then(() => {
              state.complete = true; state.animation = null; state.element.style.willChange = '';
            }, () => {});
          } catch { state.complete = true; return; }
        }
        state.element.style.willChange = 'translate'; state.animation.play();
      });
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { states.get(entry.target).visible = entry.isIntersecting; }); refresh();
    });
    states.forEach(state => observer.observe(state.element));
    preference.addEventListener('change', refresh);
    document.addEventListener('motionpreferencechange', refresh);
    document.addEventListener('visibilitychange', refresh);
    compact.addEventListener('change', () => {
      states.forEach(state => { state.animation?.cancel(); state.animation=null; state.complete=true; state.element.style.willChange=''; });
    });
  }

  const header = document.querySelector('header');
  const progress = document.querySelector('.progress');
  let frame = 0;
  let scrollRange = 1;
  const scenes = window.createMotionScenes?.({ animate, enter, tokens, preference });
  function updateScroll() {
    frame = 0;
    scenes?.update(scrollY);
    header.classList.toggle('is-scrolled', scrollY > 12);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / scrollRange))})`;
  }
  function scheduleScroll() { if (!frame && !document.hidden) frame = requestAnimationFrame(updateScroll); }
  function measure() {
    scenes?.measure();
    scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--anchor-offset', `${header.offsetHeight + 24}px`);
    scheduleScroll();
  }
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', () => { panels.forEach(state => state.finish()); measure(); }, { passive: true });
  if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(document.body);
  measure();
  window.SiteMotion = { animate, enter, filter, enhanceDetails, open: details => panels.get(details)?.set(true, true), tokens };
  enhanceDetails();
  ambientMotion();
})();
