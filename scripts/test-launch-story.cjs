// Section-specific browser checks. No production dependencies or real submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.TEST_URL || 'http://127.0.0.1:8098';
async function seek(page, progress) {
  await page.locator('.launch-story').evaluate((root, p) => {
    const header = document.querySelector('header').offsetHeight;
    const start = root.getBoundingClientRect().top + scrollY - header;
    const range = root.offsetHeight - root.querySelector('.ls-sticky').offsetHeight;
    scrollTo({ top: start + range * p, behavior: 'instant' });
  }, progress);
  await page.waitForTimeout(120);
}
async function staticChecks(page) {
  assert.equal(await page.locator('.launch-story').evaluate(e => e.classList.contains('is-story')), false);
  assert.equal(await page.locator('.ls-progress').isVisible(), false);
  assert(await page.locator('.ls-chapter-copy li').evaluateAll(items => items.every(e => getComputedStyle(e).opacity === '1' && e.offsetHeight > 0)));
  assert(await page.locator('.ls-final').isVisible());
  assert.equal(await page.locator('.ls-cta').getAttribute('href'), '#service-0');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'static overflow');
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 700 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(base);
      await page.waitForSelector('.launch-story.is-story');
      // Let the site's existing GIF introduction settle before sustained scroll QA.
      await page.waitForTimeout(5500);
      let completeTransform;
      for (const [phase, progress] of [['opening', 0], ['commerce', .27], ['attention', .53], ['momentum', .78], ['complete', 1], ['commerce', .27], ['complete', 1]]) {
        await seek(page, progress);
        assert.equal(await page.locator('.launch-story').getAttribute('data-phase'), phase);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}/${phase}`);
        const top = await page.locator('.ls-sticky').evaluate(e => e.getBoundingClientRect().top);
        const header = await page.locator('header').evaluate(e => e.offsetHeight);
        assert(Math.abs(top - header) < 2, `sticky offset ${width}/${phase}`);
        assert(await page.locator('.ls-cta').isVisible());
        if (phase !== 'opening') assert(await page.locator('.ls-store-content').evaluate(e => getComputedStyle(e).clipPath === 'inset(0% 0px 0px)'));
        if (phase === 'attention') assert(await page.locator('.ls-ad').evaluate(e => Number(e.style.opacity) > .999));
        if (phase === 'momentum') assert(await page.locator('.ls-content').evaluate(e => Number(e.style.opacity) > .999));
        if (phase === 'complete') {
          assert.equal(await page.locator('.ls-final').evaluate(e => e.style.opacity), '1');
          assert(await page.evaluate(() => document.querySelector('.ls-study-label').getBoundingClientRect().bottom < document.querySelector('.ls-copy-zone').getBoundingClientRect().top), 'visual and final copy must not overlap');
          const transform = await page.locator('.ls-store').evaluate(e => e.style.transform);
          if (completeTransform) assert.equal(transform, completeTransform, 'reverse scroll remains deterministic');
          completeTransform = transform;
        }
        await page.screenshot({ path: `/tmp/launch-${width}-${phase}.png` });
      }
      // Keyboard chapter navigation uses native scrolling, with one current step.
      await page.locator('.ls-progress button').nth(1).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.launch-story').dataset.phase === 'attention');
      await page.waitForTimeout(750);
      assert.equal(await page.locator('.ls-progress [aria-current="step"]').count(), 1);
      assert.equal(await page.locator('.ls-progress [aria-current="step"]').getAttribute('data-chapter'), '1');
      assert(await page.locator('.ls-progress button').evaluateAll(items => items.every(e => e.offsetHeight >= 44)));
      // Native exit: the sticky scene leaves with its section and the next section follows.
      await seek(page, 1.12);
      assert(await page.locator('.ls-sticky').evaluate(e => e.getBoundingClientRect().top < 0));
      // The original CTA still opens the original service, including from a filtered list.
      await page.locator('[data-filter="systems"]').click();
      await page.waitForTimeout(500);
      await seek(page, .78);
      await page.locator('.ls-cta').click();
      await page.waitForFunction(() => document.getElementById('service-0').open);
      assert.equal(await page.locator('#service-0').getAttribute('hidden'), null);
      await page.waitForFunction(() => { const top = document.getElementById('service-0').getBoundingClientRect().top; return top >= document.querySelector('header').offsetHeight - 1 && top < 150; }, null, {timeout: 4000});
      // Live preference changes clean up transforms and remove the long scroll track.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(150);
      await staticChecks(page);
      await page.locator('.launch-story').screenshot({ path: `/tmp/launch-static-${width}.png` });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForSelector('.launch-story.is-story');
      await seek(page, .53);
      assert.equal(await page.locator('.launch-story').getAttribute('data-phase'), 'attention');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: phases, reverse scroll, keyboard, entry/exit, CTA, reduced motion, assets`);
      await page.close();
    }
    for (const mode of ['no-js', 'script-blocked', 'short-screen', 'reduced']) {
      const page = await browser.newPage({ viewport: { width: 390, height: mode === 'short-screen' ? 720 : 844 }, javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      if (mode === 'script-blocked') await page.route('**/launch-story.js', r => r.abort());
      await page.goto(base);
      await staticChecks(page);
      console.log(`PASS fallback: ${mode}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
