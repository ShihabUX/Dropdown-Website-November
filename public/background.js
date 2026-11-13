/* Decorative GIF introduction, then a quiet scroll-linked still. No runtime dependency. */
(() => {
  const scene = document.querySelector('.site-atmosphere');
  const image = scene?.querySelector('img');
  if (!image) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 767px), (pointer: coarse)');
  const connection = navigator.connection;
  let timer = 0, frame = 0, started = false;
  const still = image.getAttribute('src');
  function settle() {
    clearTimeout(timer);
    if (image.getAttribute('src') !== still) image.src = still;
  }
  function update() {
    frame = 0;
    // No per-frame layout reads, inertia, or perpetual render loop.
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const travel = preference.matches ? 0 : compact.matches ? 10 : 24;
    scene.style.transform = `translate3d(0, ${-Math.min(1, scrollY / range) * travel}px, 0)`;
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  function sync() {
    if (preference.matches || document.hidden || connection?.saveData) {
      settle();
      scene.style.transform = 'none';
      cancelAnimationFrame(frame); frame = 0;
      return;
    }
    if (!started) {
      started = true;
      image.onload = () => {
        if (image.getAttribute('src') !== still) timer = setTimeout(settle, 4800);
      };
      image.onerror = () => { image.onerror = null; settle(); };
      image.src = compact.matches ? image.dataset.mobileAnimation : image.dataset.animation;
    }
    schedule();
  }
  preference.addEventListener('change', sync);
  compact.addEventListener('change', () => { settle(); schedule(); });
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  sync();
})();
