// Run against the local static server. Playwright is a QA tool, not a site dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_URL || 'http://127.0.0.1:8090';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(base);
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.service').count(), 8);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    assert(await page.locator('img').evaluateAll(imgs => imgs.filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth)));
    await page.screenshot({ path: `/tmp/dropdown-hero-${width}.png` });
    for (const [category, count] of [['launch',3], ['grow',3], ['systems',2], ['all',8]]) {
      await page.locator(`[data-filter="${category}"]`).click(); await page.waitForTimeout(550);
      assert.equal(await page.locator('.service:not([hidden])').count(), count);
      assert.equal(await page.locator(`[data-filter="${category}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.evaluate(() => ['launch','all','systems','grow','systems'].forEach((c,i) => setTimeout(() => document.querySelector(`[data-filter="${c}"]`).click(), i*35)));
    await page.waitForTimeout(700); assert.equal(await page.locator('.service:not([hidden])').count(),2);
    assert(await page.locator('.service[hidden]').evaluateAll(rows => rows.every(r => r.inert)));
    await page.evaluate(() => { location.hash = 'service-0'; }); await page.waitForTimeout(800);
    assert.equal(await page.locator('.service:not([hidden])').count(),8);
    assert(await page.locator('#service-0').evaluate(e=>e.open));
    let top=await page.locator('#service-0').evaluate(e=>e.getBoundingClientRect().top);
    assert(top >= await page.locator('header').evaluate(e=>e.offsetHeight), `deep-link offset ${top}`);
    // Exercise every service, close as well as open, with keyboard activation.
    for(let i=0;i<8;i++) {
      const row=page.locator(`#service-${i}`), summary=row.locator('summary');
      if(await row.evaluate(e=>e.open)) { await summary.click(); await page.waitForTimeout(380); }
      await summary.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(380);
      assert(await row.evaluate(e=>e.open));
      assert.equal(await summary.getAttribute('aria-expanded'),'true');
      assert(await row.locator('.detail-panel').evaluate(p=>p.clientHeight>=p.scrollHeight-1),`clipped service ${i}`);
      await page.keyboard.press('Enter'); await page.waitForTimeout(380); assert.equal(await row.evaluate(e=>e.open),false);
    }
    const first=page.locator('#service-0');
    await first.locator('summary').evaluate(el=>{el.click();setTimeout(()=>el.click(),50);setTimeout(()=>el.click(),100)});
    await page.waitForTimeout(500); assert(await first.evaluate(e=>e.open));
    await page.setViewportSize({width:width+10,height:850}); await page.waitForTimeout(100);
    assert(await first.locator('.detail-panel').evaluate(p=>!p.style.height&&p.clientHeight>=p.scrollHeight-1));
    await page.setViewportSize({width,height:900});
    await first.locator('.choose').click();
    assert.equal(await page.locator('#brief-service').inputValue(),await first.locator('h3').textContent());
    const faq=page.locator('.faq details').first(); await faq.locator('summary').focus();
    await page.keyboard.press('Space'); await page.waitForTimeout(300); assert(await faq.evaluate(e=>e.open));
    await page.keyboard.press('Space'); await page.waitForTimeout(300); assert.equal(await faq.evaluate(e=>e.open),false);
    await page.locator('[name="name"]').fill('Motion QA'); await page.locator('[name="business"]').fill('Dropdown Digital');
    await page.locator('[name="goal"]').fill('Verify the local brief download.');
    const downloading=page.waitForEvent('download'); await page.locator('#brief-form button').click();
    const download=await downloading; assert.equal(download.suggestedFilename(),'dropdown-digital-project-brief.txt');
    const text=fs.readFileSync(await download.path(),'utf8');assert(text.includes('Motion QA'));assert(text.includes('This brief has not been sent.'));
    assert.equal(await page.locator('#form-status').textContent(),'Your brief is ready to download. No inquiry has been sent.');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    await first.locator('summary').click();assert.equal(await first.evaluate(e=>e.open),false);
    await first.locator('summary').click();assert(await first.evaluate(e=>e.open));
    await page.locator('[data-filter="grow"]').click();assert.equal(await page.locator('.service:not([hidden])').count(),3);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-filter="all"]').click();await page.waitForTimeout(600);
    await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(900);
    await page.locator('.motion-toggle').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    assert.deepEqual(errors,[]);console.log(`PASS ${width}px: filters, rapid clicks, all service panels, deep links, FAQ keyboard, form download, reduced motion, assets`);
    await page.close();
  }
  const noJS=await browser.newPage({javaScriptEnabled:false});await noJS.goto(base);
  assert.equal(await noJS.locator('.service').count(),8);await noJS.locator('#service-0 summary').click();assert(await noJS.locator('#service-0').evaluate(e=>e.open));
  assert(await noJS.locator('.reveal').evaluateAll(els=>els.every(e=>getComputedStyle(e).opacity==='1')));
  console.log('PASS JavaScript disabled: eight services visible, native details usable, reveal content visible');
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{window.IntersectionObserver=undefined;Element.prototype.animate=undefined});await fallback.goto(base);
  await fallback.locator('[data-filter="launch"]').click();assert.equal(await fallback.locator('.service:not([hidden])').count(),3);
  await fallback.locator('#service-0 summary').click();assert(await fallback.locator('#service-0').evaluate(e=>e.open));
  console.log('PASS unavailable animation APIs: content and core interactions usable');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
