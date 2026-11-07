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
        if (open && start === 0) animate(panel.firstElementChild, [{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: tokens.interface });
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

  function revealSections() {
    const groups = new Map();
    document.querySelectorAll('.intro, .expertise .section-top, .manifesto .wrap, .approach .section-top, .brand-image, .faq, .brief, footer').forEach(el => groups.set(el, [el]));
    const launch = document.querySelector('.launch');
    groups.set(launch, [...launch.querySelectorAll('.eyebrow, .launch-line, figure')]);
    const steps = document.querySelector('.steps');
    groups.set(steps, [...steps.children]);
    if (typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        groups.get(entry.target)?.forEach((element, index) => enter(element, index * tokens.stagger));
      });
    }, { threshold: .08 });
    groups.forEach((elements, group) => {
      // Near-viewport content needs no reveal delay, including restored scroll positions.
      const box = group.getBoundingClientRect();
      if (box.top < innerHeight + 32) return;
      observer.observe(group);
    });
  }

  function hero() {
    if (location.hash || scrollY > 100) return;
    enter(document.querySelector('header'), 0, 6);
    enter(document.querySelector('.hero .eyebrow'), 40, 8);
    document.querySelectorAll('.headline-inner').forEach((line, index) => {
      animate(line, [
        { opacity: .65, transform: 'translateY(18px)', clipPath: 'inset(0 0 12% 0)' },
        { opacity: 1, transform: 'none', clipPath: 'inset(-12% -3% -12% -3%)' }
      ], { delay: 100 + index * 65, duration: 650 });
    });
    enter(document.querySelector('.hero-bottom p'), 220, 12);
    enter(document.querySelector('.hero-bottom .round-link'), 275, 12);
    animate(document.querySelector('.hero > img'), [{ opacity: .2, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: 300, duration: 700 });
  }

  const header = document.querySelector('header');
  const progress = document.querySelector('.progress');
  let frame = 0;
  let scrollRange = 1;
  function updateScroll() {
    frame = 0;
    header.classList.toggle('is-scrolled', scrollY > 12);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / scrollRange))})`;
  }
  function scheduleScroll() { if (!frame && !document.hidden) frame = requestAnimationFrame(updateScroll); }
  function measure() {
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
  revealSections();
  hero();
})();
