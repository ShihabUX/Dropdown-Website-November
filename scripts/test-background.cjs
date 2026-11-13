const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:8096';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<768});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(base);
  const image=page.locator('.site-atmosphere img');
  assert((await image.getAttribute('src')).endsWith(width<768?'atmosphere-mobile.gif':'atmosphere-desktop.gif'));
  await page.waitForFunction(()=>{const i=document.querySelector('.site-atmosphere img');return i.complete&&i.naturalWidth>0});
  assert.equal(await page.locator('.site-atmosphere').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('.site-atmosphere').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await page.waitForFunction(()=>document.querySelector('.site-atmosphere img').getAttribute('src').endsWith('atmosphere-still.webp'),null,{timeout:6500});
  await page.locator('.intro').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.waitForTimeout(1000);
  assert.notEqual(await page.locator('.site-atmosphere').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/tmp/atmosphere-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  assert.equal(await page.locator('.site-atmosphere').evaluate(e=>getComputedStyle(e).transform),'none');
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: correct GIF, finite playback, scroll depth, reduced motion, no overflow or errors`);await page.close();
 }
 for(const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]){
  const page=await browser.newPage(options);const gifs=[];page.on('request',r=>{if(r.url().includes('.gif'))gifs.push(r.url())});await page.goto(base);await page.waitForTimeout(200);
  assert((await page.locator('.site-atmosphere img').getAttribute('src')).endsWith('.webp'));assert.deepEqual(gifs,[]);await page.close();
 }
 const page=await browser.newPage();await page.goto(base);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);assert((await page.locator('.site-atmosphere img').getAttribute('src')).endsWith('.webp'));await page.close();
 const saver=await browser.newPage();await saver.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));const requests=[];saver.on('request',r=>{if(r.url().includes('.gif'))requests.push(r.url())});await saver.goto(base);assert.deepEqual(requests,[]);await saver.close();
 const fallback=await browser.newPage();await fallback.route('**/*.gif',r=>r.abort());await fallback.goto(base);await fallback.waitForFunction(()=>document.querySelector('.site-atmosphere img').getAttribute('src').endsWith('.webp'));await fallback.close();
 console.log('PASS data-saving skips GIF and unavailable GIF falls back to still');
 console.log('PASS no GIF requested for reduced motion / no JavaScript; live reduction stops GIF');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
