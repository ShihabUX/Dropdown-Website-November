const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:8090';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 for(const width of [320,375,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(base);await page.waitForTimeout(1400);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const lines=await page.locator('.headline-inner').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right}}));
  assert(lines.every(b=>b.left>=0&&b.right<=width),`hero clipped ${width}`);
  await page.screenshot({path:`/tmp/editorial-hero-${width}.png`});
  await page.locator('.strip').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.waitForTimeout(100);
  const ribbonBefore=await page.locator('.strip-track').evaluate(el=>getComputedStyle(el).transform);
  const glassBefore=await page.locator('.strip-glass').evaluate(el=>getComputedStyle(el).transform);
  const stationaryY=await page.evaluate(()=>scrollY);
  await page.waitForTimeout(300);
  assert.notEqual(await page.locator('.strip-track').evaluate(el=>getComputedStyle(el).transform),ribbonBefore,'Ribbon advances without scroll input');
  assert.equal(await page.evaluate(()=>scrollY),stationaryY,'Page scrolling remains native');
  assert.equal(await page.locator('.strip-track').evaluate(el=>el.getAnimations().length),1,'One compositor animation owns the track');
  await page.evaluate(()=>scrollBy({top:80,behavior:'instant'}));await page.waitForTimeout(100);
  assert.equal(await page.locator('.strip-glass').evaluate(el=>getComputedStyle(el).transform),glassBefore,'Glass stays stationary');
  assert.equal(await page.locator('.strip-glass').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('.strip-glass').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
  // The end of one group is exactly the beginning of the duplicate.
  const seam=await page.locator('.strip-track').evaluate(el=>{
   const animation=el.getAnimations()[0];animation.pause();const duration=animation.effect.getTiming().duration;
   animation.currentTime=0;const first=el.children[0].getBoundingClientRect().left;
   animation.currentTime=duration-.01;const repeated=el.children[1].getBoundingClientRect().left;
   animation.play();return Math.abs(first-repeated);
  });
  assert(seam<1,'Loop joins without a gap or jump');
  await page.screenshot({path:`/tmp/liquid-glass-${width}.png`});
  assert.equal(await page.locator('.marquee-group[aria-hidden="true"]').count(),1);
  await page.evaluate(()=>scrollTo({top:document.querySelector('.strip').offsetTop+1500,behavior:'instant'}));await page.waitForTimeout(100);
  assert.equal(await page.locator('.strip-track').evaluate(el=>el.getAnimations()[0].playState),'paused','Offscreen loop pauses');
  await page.locator('.intro').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.waitForTimeout(1100);
  assert(await page.locator('.intro-line').evaluateAll(els=>els.every(e=>getComputedStyle(e).opacity==='1')));
  await page.screenshot({path:`/tmp/editorial-intro-${width}.png`});
  for(const sel of ['.expertise','.launch','.manifesto','.approach','.question-room','.faq','.brief']){
   await page.locator(sel).evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(1100);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${sel} overflow ${width}`);
  }
  if(width===1440){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.mouse.move(1100,300);await page.waitForTimeout(350);assert.notEqual(await page.locator('.hero-depth').evaluate(e=>e.style.rotate),'0deg');}
  if(width<768)assert.equal(await page.locator('.hero-depth').evaluate(e=>e.style.rotate),'');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.locator('.strip-glass').evaluate(e=>getComputedStyle(e).display),'none');
  assert.equal(await page.locator('.strip-track').evaluate(e=>e.getAnimations().length),0);assert(await page.locator('.marquee-group[aria-hidden="true"]').evaluate(e=>e.hidden));
  assert.equal(await page.locator('.hero-depth').evaluate(e=>getComputedStyle(e).transform),'none');
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: headings, scene reveals, automatic seamless ribbon and static glass, pointer policy, reduced motion, no overflow/errors`);await page.close();
 }
 const p=await browser.newPage({javaScriptEnabled:false});await p.goto(base);assert.equal(await p.locator('.service').count(),8);assert.equal(await p.locator('.strip-track>span').count(),3);assert(await p.locator('.intro-line').evaluateAll(els=>els.every(e=>getComputedStyle(e).opacity==='1')));console.log('PASS native/static content without JavaScript');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
