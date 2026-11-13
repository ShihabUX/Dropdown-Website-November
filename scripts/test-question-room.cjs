const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:8098';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 for(const width of[320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<701});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(base);const room=page.locator('.question-room');await room.scrollIntoViewIfNeeded();await page.waitForTimeout(900);
  assert(await room.locator('img').evaluate(e=>e.complete&&e.naturalWidth===1536));
  assert(await room.locator('h2').evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}),'headline fits');
  assert.equal(await room.locator('.lb-pin').count(),3);assert.equal(await room.locator('.lb-note').count(),3);
  for(let i=1;i<=3;i++){
   const pin=room.locator(`.lb-pin[href="#lb-note-${i}"]`);await pin.scrollIntoViewIfNeeded();await pin.focus();await page.keyboard.press('Enter');await page.waitForTimeout(850);
   assert(page.url().endsWith(`#lb-note-${i}`));assert.equal(await pin.getAttribute('aria-current'),'location');
   assert(await room.locator(`#lb-note-${i}`).evaluate(e=>e.classList.contains('is-active')));
   assert(await room.locator(`#lb-note-${i}`).evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('header').offsetHeight-1),'anchor clears header');
  }
  await page.goBack();await page.waitForTimeout(200);assert.equal(await room.locator('.lb-pin-two').getAttribute('aria-current'),'location');
  await room.locator('#lb-note-1>a').click();await page.waitForTimeout(850);assert(await page.locator('#service-3').evaluate(e=>e.open&&!e.hidden));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await page.emulateMedia({reducedMotion:'reduce'});await room.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  assert.equal(await room.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: artwork, headline, annotation keyboard anchors, history, header offsets, service link, reduced motion, no overflow/errors`);await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});await page.goto(base);
 assert.equal(await page.locator('.lb-note').count(),3);await page.locator('.lb-pin-two').click();assert(page.url().endsWith('#lb-note-2'));
 console.log('PASS without JavaScript: artwork, all notes and native annotation links remain available');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
